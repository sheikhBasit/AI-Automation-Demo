'use client'
import { useEffect, useRef, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneCall, CheckCircle2, XCircle } from 'lucide-react'

type CallOrder = {
  id: string
  status: string
  callRoomUrl: string | null
}

// ponytail: ring tone is synthesized with WebAudio oscillators instead of shipping an audio file
function playRingBurst(ctx: AudioContext) {
  ;[0, 0.5].forEach((offset) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 440
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset)
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + offset + 0.05)
    gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime + offset)
    osc.stop(ctx.currentTime + offset + 0.45)
  })
}

export default function CallConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<CallOrder | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setHasAnswered(sessionStorage.getItem(`call-answered-${id}`) === '1')
  }, [id])

  useEffect(() => {
    const fetchOrder = async () => {
      const res = await fetch(`/api/orders/${id}`)
      if (res.ok) setOrder(await res.json())
    }
    fetchOrder()
    const poll = setInterval(fetchOrder, 3000)
    return () => clearInterval(poll)
  }, [id])

  const isRinging = order?.status === 'PENDING' && !!order.callRoomUrl && !hasAnswered
  const isConfirmed = order?.status === 'CONFIRMED'
  const isCancelled = order?.status === 'CANCELLED'
  const isOnCall = hasAnswered && order?.status === 'PENDING'

  useEffect(() => {
    const stopRinging = () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current)
      ringIntervalRef.current = null
      audioCtxRef.current?.close()
      audioCtxRef.current = null
    }

    if (isRinging && !audioCtxRef.current) {
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      playRingBurst(ctx)
      ringIntervalRef.current = setInterval(() => playRingBurst(ctx), 2000)
    } else if (!isRinging) {
      stopRinging()
    }

    return stopRinging
  }, [isRinging])

  const handleAnswer = () => {
    if (!order?.callRoomUrl) return
    window.open(order.callRoomUrl, '_blank', 'noopener,noreferrer')
    sessionStorage.setItem(`call-answered-${id}`, '1')
    setHasAnswered(true)
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-red-500 animate-spin mb-4" />
        <p className="text-slate-500">Loading order...</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="relative rounded-3xl p-10 shadow-2xl overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-red-950 text-white text-center">
        {isRinging && (
          <span className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/20 to-red-500/20 animate-ping" />
        )}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`h-24 w-24 rounded-full flex items-center justify-center mb-6 bg-gradient-to-br from-blue-500 to-red-500 shadow-lg shadow-blue-900/50 ${
              isRinging ? 'animate-pulse' : ''
            }`}
          >
            {isConfirmed ? (
              <CheckCircle2 className="h-12 w-12" />
            ) : isCancelled ? (
              <XCircle className="h-12 w-12" />
            ) : (
              <PhoneCall className={`h-12 w-12 ${isRinging ? 'animate-bounce' : ''}`} />
            )}
          </div>

          <h1 className="text-2xl font-black mb-1">NexusBarry</h1>
          <p className="text-blue-200 text-sm mb-6">AI Order Confirmation Agent</p>

          <p className="text-lg font-medium mb-8">
            {isConfirmed
              ? 'Order confirmed! NexusBarry has verified your order.'
              : isCancelled
              ? 'The order was cancelled during the call.'
              : isRinging
              ? 'NexusBarry is calling you now...'
              : isOnCall
              ? "You're on the call with NexusBarry..."
              : 'Preparing your confirmation call...'}
          </p>

          {isRinging && (
            <button
              onClick={handleAnswer}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-red-500 hover:from-blue-600 hover:to-red-600 px-8 py-4 rounded-full font-bold transition-all active:scale-95"
            >
              <PhoneCall className="h-5 w-5" /> Answer Call
            </button>
          )}

          {(isConfirmed || isCancelled) && (
            <button
              onClick={() => router.push(`/orders/${id}`)}
              className="px-8 py-4 rounded-full font-bold bg-white/10 hover:bg-white/20 transition-colors"
            >
              View Order
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
