from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx
import os
import logging
import urllib.parse
from dotenv import load_dotenv
from pipeline import run_pipeline
from livekit.api import AccessToken, VideoGrants
import uuid

load_dotenv()

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Agentic Order - Call Server")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

class OrderRequest(BaseModel):
    orderId: str
    customerName: str
    customerPhone: str
    address: str
    total: float
    items: list

def create_livekit_token(room_name: str, identity: str):
    grant = VideoGrants(room_join=True, room=room_name)
    # Construct AccessToken using the installed livekit API (fluent setters)
    access_token = AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
    access_token.with_grants(grant).with_identity(identity).with_name(identity)
    return access_token.to_jwt()

@app.post("/initiate-call")
async def initiate_call(order: OrderRequest, background_tasks: BackgroundTasks):
    try:
        if not LIVEKIT_API_KEY:
            raise HTTPException(status_code=500, detail="LIVEKIT_API_KEY not configured")

        room_name = f"order-{order.orderId}-{uuid.uuid4().hex[:6]}"
        
        # Token for the customer to join
        customer_token = create_livekit_token(room_name, order.customerName)
        
        # Generate a hosted LiveKit Meet URL for the customer
        encoded_url = urllib.parse.quote(LIVEKIT_URL, safe='')
        room_url = f"https://meet.livekit.io/custom?liveKitUrl={encoded_url}&token={customer_token}"
        
        nextjs_url = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{nextjs_url}/api/orders/{order.orderId}",
                json={"callRoomUrl": room_url, "callStatus": "CALLING"}
            )

        # Token for the agent to join
        agent_token = create_livekit_token(room_name, "OrderAgent")

        # Run Pipecat pipeline
        background_tasks.add_task(run_pipeline, LIVEKIT_URL, agent_token, room_name, order.model_dump())
        
        return {"success": True, "room_url": room_url}
    except Exception as e:
        logger.exception("initiate_call failed")
        raise HTTPException(status_code=500, detail=str(e))
