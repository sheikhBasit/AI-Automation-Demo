# Agentic Order

An e-commerce demo where every checkout ends in a real phone call: **NexusBarry**, an AI
voice agent, calls the customer, reads back their order, and confirms or cancels it —
live, over LiveKit — before the order is marked `CONFIRMED`. Storefront is Next.js with a
blue/red gradient theme; the call → confirm loop is wired through n8n.

## Architecture

```
Checkout (Next.js) → POST /api/orders → POST /api/trigger-call
                                              │
                                              ▼
                              n8n: "Order Placed — Trigger AI Call"
                                              │  POST /initiate-call
                                              ▼
                              agent-server (FastAPI + Pipecat)
                        creates a LiveKit room, PATCHes the order to
                        callStatus=CALLING, runs the voice pipeline
                     (Deepgram STT → Groq LLM → Deepgram TTS) in the background
                                              │
                          customer answers on /orders/[id]/call (ringtone via Web Audio API)
                                              │  agent calls confirm_order / cancel_order
                                              ▼
                              n8n: "Call Result Handler — Update Order"
                                              │  PATCHes order
                                              ▼
                              order.status = CONFIRMED / CANCELLED
```

See `DEVELOPMENT_PLAN.md` for the full original architecture/deployment plan and
`AGENT_PROMPTS.md` for the voice agent's system prompt and tool definitions.

## Prerequisites

- Docker + Docker Compose (deployment path), or Node.js 20+ and Python 3.11+ (local dev path)
- API keys: [Groq](https://console.groq.com), [Deepgram](https://deepgram.com),
  [LiveKit Cloud](https://cloud.livekit.io)

## Setup

```bash
cp agent-server/.env.example agent-server/.env
# edit agent-server/.env and fill in GROQ_API_KEY, DEEPGRAM_API_KEY, LIVEKIT_URL,
# LIVEKIT_API_KEY, LIVEKIT_API_SECRET
```

## Running it — Docker Compose (deployment)

`docker-compose.yml` at the repo root builds and runs all three services — the storefront,
the agent server, and n8n — on one Docker network, so they reach each other by service name
(`web`, `agent-server`, `n8n`) with no manual networking setup.

```bash
docker compose up -d --build

# first run only: apply the schema and seed demo products
docker compose exec web npx prisma db seed
```

- Storefront: http://localhost:3000
- Agent server: http://localhost:8000/docs
- n8n: http://localhost:5678

### Wire up the n8n workflows (first time only)

The two workflows that bridge checkout → agent-server → order status live in
`agent-server/n8n-workflows/*.json`, already parameterized with `$env.AGENT_SERVER_URL` /
`$env.NEXTJS_URL` (set by `docker-compose.yml` to the container service names — no hardcoded
IPs). Import and activate them inside the running n8n container:

```bash
docker compose cp agent-server/n8n-workflows/order-placed-trigger-call.json n8n:/tmp/wf1.json
docker compose cp agent-server/n8n-workflows/call-result-handler.json n8n:/tmp/wf2.json

docker compose exec n8n n8n import:workflow --input=/tmp/wf1.json
docker compose exec n8n n8n import:workflow --input=/tmp/wf2.json

docker compose exec n8n n8n list:workflow   # note the two new workflow IDs
docker compose exec n8n n8n publish:workflow --id=<id-of-workflow-1>
docker compose exec n8n n8n publish:workflow --id=<id-of-workflow-2>

docker compose restart n8n   # activation only takes effect after a restart
```

## Running it — local dev (no Docker for the app)

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma db seed

cd agent-server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd ..
```

Three processes, three terminals:

```bash
# Terminal 1 — storefront
npm run dev                                   # http://localhost:3000

# Terminal 2 — voice agent server
cd agent-server && .venv/bin/uvicorn agent:app --host 0.0.0.0 --port 8000

# Terminal 3 — n8n only, in Docker
docker run -d --name n8n -p 5678:5678 \
  -e N8N_HOST=localhost -e N8N_PROTOCOL=http -e WEBHOOK_URL=http://localhost:5678 \
  -v n8n_data:/home/node/.n8n n8nio/n8n
```

**Gotcha:** here the storefront and agent server run on the host, not in Docker, so
`http://web:3000` / `http://agent-server:8000` won't resolve from inside the n8n
container. `host.docker.internal` doesn't resolve either on plain Linux Docker — instead,
set the two env vars on the n8n container to the bridge gateway IP:

```bash
docker network inspect bridge | grep Gateway   # often 172.17.0.1
docker stop n8n && docker rm n8n
docker run -d --name n8n -p 5678:5678 \
  -e N8N_HOST=localhost -e N8N_PROTOCOL=http -e WEBHOOK_URL=http://localhost:5678 \
  -e AGENT_SERVER_URL=http://172.17.0.1:8000 -e NEXTJS_URL=http://172.17.0.1:3000 \
  -v n8n_data:/home/node/.n8n n8nio/n8n
```

Then import the workflows the same way as above, substituting `docker exec` for
`docker compose exec`.

## Try it

Open `http://localhost:3000`, add a product to the cart, and check out with any name/
email/phone/address. You'll be redirected to `/orders/[id]/call`, which rings (a
synthesized ringtone, no audio file) once NexusBarry's call is live. Answering opens the
LiveKit room where the agent reads back the order and asks for confirmation.

To trigger the confirmation step manually without talking to the agent:

```bash
curl -X POST http://localhost:5678/webhook/call-result \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<order-id>","confirmed":true}'
```

To watch the workflow executions live: open `http://localhost:5678` → the workflow →
**Executions** tab.

## Useful commands

```bash
npx prisma studio                  # browse the SQLite DB (local dev)
npm run lint                       # eslint
docker compose logs -f n8n         # tail n8n execution logs
docker compose logs -f agent-server
docker compose down                # stop everything (add -v to also wipe volumes/data)
```

## Prompt used to generate this app

The app was built with an AI coding agent from the following brief:

> Build an e-commerce storefront (Next.js App Router, Tailwind, Prisma/SQLite, Zustand
> cart) with a product catalog, cart, and checkout flow. When a customer checks out,
> trigger an automated phone call through an AI voice agent (Pipecat pipeline: Deepgram
> STT → Groq LLM → Deepgram TTS, running in a LiveKit room) that reads back the order and
> total and asks the customer to confirm or cancel. Orchestrate the checkout → call →
> confirmation-result loop through n8n webhooks, so the storefront and the voice agent
> server never call each other directly. After checkout, open a dedicated call
> confirmation page that rings (no audio asset — synthesize the ringtone) to show the
> agent is calling, and updates live to a confirmed/cancelled state once the call result
> comes back. Brand the voice agent "NexusBarry". Style the whole site with blue and red
> gradients — no black.
