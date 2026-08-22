import asyncio
import os
import sys

from pipecat.frames.frames import EndFrame, Frame, LLMRunFrame, TTSTextFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.turns.user_turn_strategies import UserTurnStrategies
from pipecat.turns.user_stop import SpeechTimeoutUserTurnStopStrategy
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.deepgram.tts import DeepgramTTSService
from pipecat.services.groq.llm import GroqLLMService
from pipecat.services.llm_service import FunctionCallParams
from pipecat.transports.livekit.transport import LiveKitTransport, LiveKitParams as LiveKitTransportParams
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.processors.audio.vad_processor import VADProcessor

from tools import confirm_order, cancel_order


class ChatRelay(FrameProcessor):
    """Mirrors NexusBarry's spoken lines into the LiveKit room's chat panel.

    # ponytail: reaches into transport._client.room because pipecat's LiveKit
    # transport has no public API for topic-based text streams yet.
    """

    def __init__(self, transport: LiveKitTransport, **kwargs):
        super().__init__(**kwargs)
        self._transport = transport

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)
        if isinstance(frame, TTSTextFrame) and frame.text.strip():
            asyncio.create_task(self.send_chat(frame.text))
        await self.push_frame(frame, direction)

    async def send_chat(self, text: str):
        try:
            room = self._transport._client.room
            await room.local_participant.send_text(text, topic="lk.chat")
        except Exception as e:
            print(f"Failed to relay chat message: {e}")

async def run_pipeline(url: str, token: str, room_name: str, order_data: dict):
    print(f"Starting Pipecat pipeline for order {order_data['orderId']} in room {room_name}")

    # Transport
    transport = LiveKitTransport(
        url=url,
        token=token,
        room_name=room_name,
        params=LiveKitTransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        )
    )
    vad = VADProcessor(vad_analyzer=SileroVADAnalyzer())

    # Services
    stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))
    tts = DeepgramTTSService(api_key=os.getenv("DEEPGRAM_API_KEY"), voice="aura-asteria-en")
    llm = GroqLLMService(api_key=os.getenv("GROQ_API_KEY"), model="openai/gpt-oss-20b")

    items_summary = ", ".join([f"{item['quantity']}x {item.get('product', {}).get('name', 'Item')}" for item in order_data.get('items', [])])
    prompt = f"""
    You are a phone agent for Agentic Order, calling to confirm a customer's order.

    Your reply is converted directly to speech, so:
    - Output plain spoken sentences only.
    - Never use markdown, headers, numbered lists, asterisks, or stage directions.
    - Never describe what you would do or narrate your own logic — just speak naturally, and call a function when one applies.

    Open the call with exactly this, adjusted only for natural phrasing:
    "Hello, am I speaking with {order_data['customerName']}? Great! I'm calling to confirm your recent order with us. You've ordered: {items_summary}. The total comes to ${order_data['total']}. I have your delivery address as {order_data['address']}, and your contact number as {order_data['customerPhone']}. Can you confirm the order and that those details are correct?"

    Only call confirm_order or cancel_order after the customer has clearly and
    explicitly answered your question, in their own words, in a turn that
    directly follows it. Never call either function based on a short,
    garbled, or out-of-context fragment — audio echo or background noise can
    produce fake transcripts that are not the customer actually speaking. If
    what you heard doesn't clearly and unambiguously answer your question,
    say you didn't catch that and ask them to repeat it — do not guess.

    If the customer confirms, call the confirm_order function.
    If the customer declines or hesitates, ask once more politely, then call cancel_order if they still decline.

    Keep the call under 2 minutes. Be natural, not robotic.
    """

    chat_relay = ChatRelay(transport)

    async def hang_up_after_closing_line():
        # ponytail: fixed delay for the closing TTS line to play out, instead of
        # tracking bot-speaking state; bump this if closing lines run long.
        await asyncio.sleep(6)
        await task.stop_when_done()

    async def confirm_order_with_chat(params: FunctionCallParams):
        result = await confirm_order(order_data["orderId"], order_data)
        await chat_relay.send_chat(result)
        await params.result_callback(result)
        asyncio.create_task(hang_up_after_closing_line())

    async def cancel_order_with_chat(params: FunctionCallParams):
        result = await cancel_order(order_data["orderId"], order_data)
        await chat_relay.send_chat(result)
        await params.result_callback(result)
        asyncio.create_task(hang_up_after_closing_line())

    llm.register_function("confirm_order", confirm_order_with_chat)
    llm.register_function("cancel_order", cancel_order_with_chat)

    tools = ToolsSchema(standard_tools=[
        FunctionSchema(
            name="confirm_order",
            description="Call this when the customer explicitly confirms the order.",
            properties={},
            required=[],
        ),
        FunctionSchema(
            name="cancel_order",
            description="Call this when the customer explicitly declines or cancels the order.",
            properties={},
            required=[],
        ),
    ])

    messages = [
        {"role": "system", "content": prompt}
    ]

    context = LLMContext(messages=messages, tools=tools)
    # ponytail: the default turn-stop strategy runs a local neural end-of-turn
    # model (LocalSmartTurnAnalyzerV3), which without GPU acceleration took up
    # to ~70s to decide the caller had stopped talking. Plain VAD-silence
    # timeout is instant and plenty for a phone call.
    context_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            user_turn_strategies=UserTurnStrategies(
                stop=[SpeechTimeoutUserTurnStopStrategy(user_speech_timeout=0.6)]
            )
        ),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            vad,
            stt,
            context_aggregator.user(),
            llm,
            tts,
            chat_relay,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))

    @transport.event_handler("on_participant_connected")
    async def on_participant_connected(transport, participant_id):
        print(f"Participant connected: {participant_id}")
        await task.queue_frames([LLMRunFrame()])

    runner = PipelineRunner()
    try:
        await runner.run(task)
    except Exception as e:
        print(f"Pipeline error: {e}")
