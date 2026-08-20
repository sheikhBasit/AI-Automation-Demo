# 🛒 Agentic Order System — Complete Development Plan

> **Project:** AI-powered e-commerce order placement with automated voice call confirmation, n8n workflow orchestration, and multi-platform deployment.
> **Stack:** Next.js · Pipecat · Groq · Deepgram · n8n · Prisma · Docker · Vercel + VPS

---

## 📐 System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER BROWSER                             │
│          Homepage ──► Cart ──► Checkout ──► Order Detail             │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼─────────────────────────────────────────┐
│                    NEXT.JS APP  (Vercel)                              │
│                                                                      │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────────────┐   │
│  │ /api/orders  │   │/api/trigger-   │   │/api/webhook/dispatch  │   │
│  │   (create)   │──►│    call        │   │  (receive from n8n)  │   │
│  └──────────────┘   └───────┬────────┘   └──────────────────────┘   │
│         │                   │ fires n8n webhook                      │
└─────────┼───────────────────┼────────────────────────────────────────┘
          │ DB write           │
          ▼                   ▼
    ┌──────────┐   ┌──────────────────────────────────────────────────┐
    │  SQLite  │   │              n8n  (VPS / n8n Cloud)              │
    │ (dev)    │   │                                                  │
    │ Postgres │   │  Webhook Trigger ──► Switch (order value)        │
    │ (prod)   │   │       │                                          │
    └──────────┘   │       ├──► HTTP POST ──► Agent Server            │
                   │       │      (trigger AI voice call)             │
                   │       ├──► Send Email (Gmail/Resend node)        │
                   │       ├──► Send SMS  (Twilio node)               │
                   │       ├──► Slack Alert (admin notify)            │
                   │       └──► Wait for call result webhook          │
                   │                    │                             │
                   │              ┌─────┴─────┐                       │
                   │           Confirmed    Cancelled                  │
                   │              │             │                      │
                   │         Update DB     Notify admin               │
                   │         + Dispatch    + Cancel order             │
                   │           Webhook                                │
                   └──────────────────────────────────────────────────┘
                                  │
                   ┌──────────────▼───────────────────────────────────┐
                   │        AGENT SERVER  (VPS / Docker)              │
                   │                                                  │
                   │  FastAPI  ──►  Pipecat Pipeline                  │
                   │                    │                             │
                   │  ┌─────────────────▼──────────────────────────┐ │
                   │  │  Deepgram STT ──► Groq LLM ──► Deepgram TTS│ │
                   │  │       (listen)     (think)      (speak)     │ │
                   │  └─────────────────────────────────────────────┘ │
                   │              Daily.co WebRTC Room                │
                   │         (customer joins via link on order page)  │
                   └──────────────────────────────────────────────────┘
```

---

## 🗂️ Project Folder Structure

```
Agentic Order/
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 next.config.ts
├── 📄 tailwind.config.ts
├── 📄 postcss.config.mjs
├── 📄 .env.local.example
├── 📄 .gitignore
├── 📄 vercel.json
├── 📄 README.md
│
├── 📁 prisma/
│   ├── schema.prisma          # DB models
│   └── seed.ts                # 8 demo products
│
├── 📁 src/
│   ├── 📁 app/
│   │   ├── layout.tsx         # Root layout + font + toast provider
│   │   ├── page.tsx           # 🏠 Homepage: product grid + hero
│   │   ├── globals.css
│   │   ├── 📁 cart/
│   │   │   └── page.tsx       # 🛒 Cart: items, qty, summary
│   │   ├── 📁 checkout/
│   │   │   └── page.tsx       # 💳 Checkout: multi-step form
│   │   ├── 📁 orders/
│   │   │   ├── page.tsx       # 📋 All orders list
│   │   │   └── [id]/
│   │   │       └── page.tsx   # 📦 Order detail + live call status
│   │   └── 📁 api/
│   │       ├── products/route.ts          # GET all products
│   │       ├── orders/route.ts            # POST create order
│   │       ├── orders/[id]/route.ts       # GET + PATCH order
│   │       ├── trigger-call/route.ts      # POST → fires n8n webhook
│   │       └── webhook/dispatch/route.ts  # POST ← receives from n8n
│   │
│   ├── 📁 components/
│   │   ├── Navbar.tsx
│   │   ├── ProductCard.tsx
│   │   ├── CartItem.tsx
│   │   ├── OrderStatus.tsx        # Status timeline component
│   │   ├── CallStatusBadge.tsx    # Animated live call badge
│   │   └── 📁 ui/
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       └── Modal.tsx
│   │
│   ├── 📁 lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── n8n.ts             # n8n webhook helper
│   │
│   ├── 📁 store/
│   │   └── cart.ts            # Zustand cart store (persisted)
│   │
│   └── 📁 types/
│       └── index.ts           # Shared TypeScript types
│
└── 📁 agent-server/           # Python Pipecat AI calling agent
    ├── agent.py               # FastAPI server + /initiate-call endpoint
    ├── pipeline.py            # Pipecat STT → LLM → TTS pipeline
    ├── tools.py               # confirm_order / cancel_order tools
    ├── webhook.py             # Posts result back to n8n
    ├── requirements.txt
    ├── .env.example
    ├── Dockerfile
    ├── docker-compose.yml     # Runs agent-server + n8n together
    └── 📁 deploy/
        ├── nginx.conf         # Reverse proxy config
        └── agentic-order.service  # Systemd service file
```

---

## 🗃️ Database Schema

```prisma
model Product {
  id          String      @id @default(cuid())
  name        String
  description String
  price       Float
  image       String
  category    String
  stock       Int         @default(100)
  createdAt   DateTime    @default(now())
  orderItems  OrderItem[]
}

model Order {
  id            String      @id @default(cuid())
  customerName  String
  customerPhone String
  customerEmail String
  address       String
  city          String
  total         Float
  status        String      @default("PENDING")
  // PENDING | CONFIRMED | DISPATCHED | DELIVERED | CANCELLED
  callStatus    String      @default("PENDING")
  // PENDING | CALLING | CONFIRMED_BY_CALL | FAILED | CANCELLED_BY_CALL
  callRoomUrl   String?     // Daily.co room link
  callAttempts  Int         @default(0)
  webhookSent   Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  items         OrderItem[]
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  quantity  Int
  price     Float
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
}
```

---

## 🔄 Complete Order Flow (Step by Step)

```
Step 1:  Customer browses products on homepage
Step 2:  Adds items to cart (Zustand, persisted in localStorage)
Step 3:  Proceeds to checkout → fills name, phone, email, address
Step 4:  Clicks "Place Order"
           └─► POST /api/orders
                 ├─ Creates Order + OrderItems in DB
                 └─ Returns { orderId, callRoomUrl }

Step 5:  Next.js fires POST /api/trigger-call
           └─► Calls n8n webhook with full order payload

Step 6:  n8n workflow starts:
           ├─ Sends confirmation email to customer
           ├─ Logs to Google Sheets (optional)
           └─ POSTs to Agent Server: POST /initiate-call

Step 7:  Agent Server (Pipecat):
           ├─ Creates Daily.co WebRTC room
           ├─ Saves room URL to DB (PATCH /api/orders/[id])
           ├─ AI agent joins the room
           └─ Customer sees "Join your confirmation call" link on order page

Step 8:  Customer clicks the call link → joins Daily.co room in browser
           AI Agent speaks:
           "Hi [Name]! Confirming your order of [items] totaling $X.
            Do you confirm this order?"

Step 9:  Deepgram STT listens to customer response
         Groq LLM (llama-3.3-70b) processes intent
         Deepgram/ElevenLabs TTS responds

Step 10: Customer says "Yes" / "Confirm"
           └─► Groq calls confirm_order tool
                 └─► POST to n8n webhook: { orderId, confirmed: true }

         OR Customer says "No" / "Cancel"
           └─► Groq calls cancel_order tool
                 └─► POST to n8n webhook: { orderId, confirmed: false }

Step 11: n8n receives call result:
         IF confirmed:
           ├─ PATCH /api/orders/[id] → status: CONFIRMED
           ├─ POST to Dispatch Webhook (warehouse/ERP)
           └─ Send "Order Confirmed" email/SMS to customer
         IF cancelled:
           ├─ PATCH /api/orders/[id] → status: CANCELLED
           └─ Notify admin via Slack/email

Step 12: Order detail page polls /api/orders/[id] every 5s
         → shows live status update to customer
```

---

## 🧩 n8n Workflow Nodes (Import-Ready)

### Workflow 1: `Order Placed Trigger`
| # | Node | Type | Action |
|---|------|------|--------|
| 1 | Order Webhook | Webhook | Receives order from Next.js |
| 2 | Set Variables | Set | Extract orderId, name, phone, total, items |
| 3 | Send Email | Gmail/Resend | Customer confirmation email |
| 4 | Trigger AI Call | HTTP Request | POST to Agent Server `/initiate-call` |
| 5 | Log to Sheets | Google Sheets | Append order row |
| 6 | Slack Alert | Slack | Notify admin of new order |

### Workflow 2: `Call Result Handler`
| # | Node | Type | Action |
|---|------|------|--------|
| 1 | Call Result Webhook | Webhook | Receives { orderId, confirmed } from agent |
| 2 | IF Node | IF | confirmed === true ? |
| 3a | Update Order (Yes) | HTTP Request | PATCH /api/orders/[id] → CONFIRMED |
| 3b | Update Order (No) | HTTP Request | PATCH /api/orders/[id] → CANCELLED |
| 4a | Dispatch Webhook | HTTP Request | POST to warehouse/ERP system |
| 4b | Admin Alert | Slack/Email | Notify team of cancellation |
| 5a | Send SMS (Confirmed) | Twilio | "Your order has been confirmed!" |
| 5b | Send SMS (Cancelled) | Twilio | "Your order was cancelled." |

---

## 🤖 AI Agent System Prompt

```
You are an order confirmation agent for [Store Name].
Your job is to confirm customer orders by phone.

ALWAYS:
- Greet the customer by their first name
- State the order items and total clearly
- Ask for explicit confirmation
- Be polite and concise

SCRIPT:
"Hello, am I speaking with {customerName}? 
Great! I'm calling to confirm your recent order with us.
You've ordered: {orderItemsSummary}
The total comes to ${orderTotal}.
Can you confirm this order?"

IF customer says YES / confirms:
  → Call the confirm_order function

IF customer says NO / cancels / hesitates:
  → Ask once more politely, then call cancel_order if still no

Keep the call under 2 minutes. Be natural, not robotic.
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List all products |
| `POST` | `/api/orders` | Create new order → triggers automation |
| `GET` | `/api/orders/[id]` | Get order details + call status |
| `PATCH` | `/api/orders/[id]` | Update order status (used by n8n) |
| `POST` | `/api/trigger-call` | Fires n8n webhook (internal) |
| `POST` | `/api/webhook/dispatch` | Receives confirmation from n8n |

### Agent Server API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/initiate-call` | Start AI call for an order |
| `GET` | `/call-status/{orderId}` | Get current call status |
| `POST` | `/call-result` | Internal: pipeline posts result |

---

## 🔑 Environment Variables

### Next.js (`.env.local`)
```env
DATABASE_URL="file:./dev.db"                    # SQLite (dev) or postgres:// (prod)
N8N_WEBHOOK_URL="https://your-n8n.com/webhook/ORDER_PLACED"
N8N_CALL_RESULT_WEBHOOK="https://your-n8n.com/webhook/CALL_RESULT"
AGENT_SERVER_URL="http://localhost:8000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Agent Server (`.env`)
```env
GROQ_API_KEY="gsk_..."
DEEPGRAM_API_KEY="..."
ELEVENLABS_API_KEY="..."         # Optional (Deepgram TTS is default)
DAILY_API_KEY="..."              # Daily.co for WebRTC rooms
N8N_CALL_RESULT_URL="https://your-n8n.com/webhook/CALL_RESULT"
NEXTJS_API_URL="https://your-app.vercel.app"
```

---

## 📦 Technology Dependencies

### Next.js App
```json
{
  "dependencies": {
    "next": "15.x",
    "@prisma/client": "^5.x",
    "zustand": "^5.x",
    "react-hot-toast": "^2.x",
    "lucide-react": "^0.x",
    "clsx": "^2.x"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x"
  }
}
```

### Agent Server (`requirements.txt`)
```
fastapi==0.115.x
uvicorn[standard]==0.32.x
pipecat-ai[daily,deepgram,groq,elevenlabs,silero]==0.0.x
python-dotenv==1.x
httpx==0.27.x
pydantic==2.x
```

---

## 🚀 Phase-by-Phase Development Plan

### Phase 1 — Foundation (Day 1–2)
- [x] Initialize Next.js 15 project with TypeScript + Tailwind
- [ ] Set up Prisma schema + SQLite
- [ ] Seed 8 demo products
- [ ] Build Zustand cart store with localStorage persistence
- [ ] Create shared TypeScript types

### Phase 2 — Frontend (Day 2–3)
- [ ] Homepage: hero section + product grid + category filter
- [ ] Product cards with Add to Cart animation
- [ ] Navbar with cart count badge
- [ ] Cart page: items list + quantity controls + order summary
- [ ] Checkout page: multi-step form (Contact → Address → Review)
- [ ] Order detail page: timeline + live call status polling

### Phase 3 — Backend API (Day 3–4)
- [ ] `GET /api/products` — return seeded products
- [ ] `POST /api/orders` — validate, create DB records, trigger automation
- [ ] `GET/PATCH /api/orders/[id]` — fetch and update orders
- [ ] `POST /api/trigger-call` — fire n8n webhook
- [ ] `POST /api/webhook/dispatch` — receive n8n call result

### Phase 4 — AI Agent Server (Day 4–5)
- [ ] FastAPI server scaffold with `/initiate-call` endpoint
- [ ] Daily.co room creation via REST API
- [ ] Pipecat pipeline: VAD → Deepgram STT → Groq LLM → Deepgram TTS
- [ ] LLM context setup with order confirmation system prompt
- [ ] Function tools: `confirm_order`, `cancel_order`
- [ ] Webhook sender back to n8n on call completion

### Phase 5 — n8n Automation (Day 5–6)
- [ ] Self-host n8n via Docker OR use n8n Cloud free tier
- [ ] Build Workflow 1: Order Placed (email + call trigger + logging)
- [ ] Build Workflow 2: Call Result Handler (update DB + dispatch + SMS)
- [ ] Export workflows as JSON for version control
- [ ] Test full end-to-end flow locally

### Phase 6 — Deployment (Day 6–7)
- [ ] **Vercel:** Deploy Next.js + configure Postgres (Neon/Supabase)
- [ ] **VPS:** Provision DigitalOcean Droplet (Ubuntu 22.04, $12/mo)
- [ ] **VPS:** Install Docker + docker-compose
- [ ] **VPS:** Deploy agent-server + n8n via docker-compose
- [ ] **VPS:** Configure Nginx reverse proxy + SSL (Certbot)
- [ ] Update all environment variables with production URLs
- [ ] End-to-end production test

---

## 🖥️ Deployment Guide

### Option A — Vercel (Next.js) + VPS (Agent + n8n)

#### Vercel Deployment
```bash
# 1. Push code to GitHub
git init && git add . && git commit -m "Initial commit"
gh repo create agentic-order --public --push

# 2. Import repo on vercel.com → auto-detects Next.js
# 3. Add environment variables in Vercel dashboard
# 4. Set DATABASE_URL to your Neon/Supabase Postgres connection string
```

#### VPS Deployment (DigitalOcean Ubuntu 22.04)
```bash
# 1. SSH into your droplet
ssh root@YOUR_VPS_IP

# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Clone your repo
git clone https://github.com/you/agentic-order.git
cd agentic-order/agent-server

# 4. Set environment variables
cp .env.example .env
nano .env   # Fill in your keys

# 5. Start services
docker-compose up -d

# 6. Install Nginx + Certbot
apt install nginx certbot python3-certbot-nginx -y

# 7. Configure Nginx (copy deploy/nginx.conf)
cp deploy/nginx.conf /etc/nginx/sites-available/agentic-order
ln -s /etc/nginx/sites-available/agentic-order /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 8. Get SSL certificate
certbot --nginx -d agent.yourdomain.com
```

#### `docker-compose.yml` (VPS)
```yaml
version: '3.8'
services:
  agent-server:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    restart: unless-stopped

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.yourdomain.com
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  n8n_data:
```

#### `nginx.conf`
```nginx
server {
    server_name agent.yourdomain.com;
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    server_name n8n.yourdomain.com;
    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 💰 Cost Breakdown

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel (Next.js) | ✅ Free | $20/mo Pro |
| Neon Postgres | ✅ 512MB free | $19/mo |
| DigitalOcean VPS | ❌ | $12/mo (2GB RAM) |
| n8n Cloud | ✅ Free (5 workflows) | $20/mo |
| Groq API | ✅ Free tier | Pay per token |
| Deepgram STT | ✅ $200 credit | $0.0043/min |
| Daily.co WebRTC | ✅ 10k min/mo free | $0.004/min |
| ElevenLabs TTS | ✅ 10k chars/mo | $5/mo |

**Estimated Monthly Cost (production):** ~$30–50/mo

---

## 🧪 Demo Products (Seeded)

| Product | Category | Price |
|---------|----------|-------|
| Wireless Pro Headphones | Electronics | $89.99 |
| Smart Watch Series X | Electronics | $199.99 |
| USB-C 7-in-1 Hub | Electronics | $45.99 |
| Premium Cotton Hoodie | Clothing | $69.99 |
| Slim Fit Stretch Jeans | Clothing | $59.99 |
| French Press Coffee Maker | Home & Kitchen | $34.99 |
| Bamboo Cutting Board Set | Home & Kitchen | $24.99 |
| Professional Yoga Mat | Sports | $29.99 |

---

## ✅ Quick Start Commands

```bash
# ── NEXT.JS APP ──────────────────────────────────────
cd "Agentic Order"
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
# → Open http://localhost:3000

# ── AGENT SERVER ─────────────────────────────────────
cd "Agentic Order/agent-server"
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Add your API keys
uvicorn agent:app --reload --port 8000
# → Open http://localhost:8000/docs

# ── N8N (LOCAL) ───────────────────────────────────────
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
# → Open http://localhost:5678
# Import workflow JSONs from agent-server/n8n-workflows/
```
