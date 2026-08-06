# ForkFlow 🍴

> **Production-grade, full-stack food ordering & real-time delivery platform** built with Node.js, Express, Next.js, PostgreSQL, Redis, BullMQ, Socket.io, Groq, and Hugging Face RAG.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-FF4500?style=flat&logo=bullmq&logoColor=white)](https://taskforcesh.github.io/bullmq/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Groq](https://img.shields.io/badge/Groq-F05032?style=flat&logo=groq&logoColor=white)](https://groq.com/)
[![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-FFD21E?style=flat&logoColor=black)](https://huggingface.co/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat&logo=cloudinary&logoColor=white)](https://cloudinary.com/)

---

## 📌 Executive Overview & Engineering Highlights

ForkFlow is built to tackle real-world food ordering challenges beyond standard CRUD applications:

1. **Kitchen Capacity Slot Allocation**: Kitchens cannot cook infinite orders simultaneously. Orders allocate limited capacity slots in 15-minute time-windows.
2. **Concurrency & Race Condition Safety**: Atomic execution using Redis distributed locks and serialized BullMQ queues guarantees zero double-allocation on inventory or capacity slots.
3. **Idempotent Order Processing**: Prevents double-charging or duplicated order execution using Redis-backed idempotency tokens.
4. **Real-time Order & Delivery Tracking**: Live bidirectional updates over Socket.io backed by Redis Pub/Sub, linking customers, restaurant kitchens, and delivery partners with live map coordinates.
5. **AI Concierge (RAG)**: Natural-language dish and restaurant discovery using LangChain.js, Hugging Face embeddings (`all-MiniLM-L6-v2`), Groq LLM (`llama-3.3-70b-versatile`), and PostgreSQL `pgvector` similarity search.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (Next.js 14)"]
        UI[Customer / Restaurant / Delivery UI]
        Store[Zustand & TanStack Query State]
    end

    subgraph API["Backend API Layer (Express.js)"]
        Server[Express REST API]
        Auth[JWT & Role Guard Middleware]
        Capacity[Kitchen Slot Math]
        Lock[Redis Distributed Lock]
    end

    subgraph Realtime["Real-Time Layer"]
        Socket[Socket.io WebSocket Server]
    end

    subgraph Queue["Async Job Pipeline (BullMQ)"]
        OrderQ[Order Processing Queue]
        EmailQ[Nodemailer Email Queue]
        NotifQ[Notification Queue]
        Worker[BullMQ Worker Process]
    end

    subgraph Storage["Data & Cache Layer"]
        PG[(PostgreSQL + pgvector)]
        Redis[(Redis Cache & Pub/Sub)]
    end

    subgraph External["External Services"]
        Cloudinary[Cloudinary CDN]
        AI[Groq & Hugging Face AI]
    end

    UI <-->|REST / JSON| Server
    UI <-->|WebSocket| Socket
    Server --> Auth
    Server --> Capacity
    Server --> Lock
    Lock <--> Redis
    Server -->|Enqueue Jobs| OrderQ
    OrderQ --> Worker
    EmailQ --> Worker
    NotifQ --> Worker
    Worker --> PG
    Server <--> PG
    Socket <-->|Pub/Sub| Redis
    Server --> Cloudinary
    Server --> AI
```

---

## 🛠️ Tech Stack & Role Breakdown

| Component | Technology | Primary Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router) | SSR for search engine visibility & dynamic dashboards |
| **UI Library & Styles** | Tailwind CSS + Lucide Icons | Responsive modern design system |
| **Client State** | Zustand & TanStack Query | Lightweight store for active cart & server-state caching |
| **Backend Runtime** | Node.js & Express.js (TypeScript) | Modular monolith architecture |
| **Database** | PostgreSQL (Supabase) + pgvector | Relational transactions & vector embeddings |
| **In-Memory Cache & Mutex** | Redis (ioredis) | Caching, locks, counters, sorted sets, Pub/Sub |
| **Job Queue & Workers** | BullMQ | Serialized order execution, retries, background jobs |
| **Queue Monitoring** | Bull Board | Visual queue status dashboard (`/admin/queues`) |
| **Real-time Engine** | Socket.io | Bidirectional order status & delivery location streaming |
| **AI / RAG Concierge** | Groq (Llama 3.3 70B) + Hugging Face | Natural language menu search and query answering |
| **Media Hosting** | Cloudinary | CDN image uploading & transformation |
| **Containerization** | Docker & Docker Compose | Containerized local infrastructure |

### ⚡ 5 Roles of Redis in ForkFlow
- **Cache-Aside**: High-speed caching for restaurant listings and menus.
- **Distributed Mutex**: Mutex locks preventing race conditions during checkout.
- **Atomic Counters**: Live remaining slot counts and item stock levels (`INCR`/`DECR`).
- **Sorted Sets**: Ranking popular and nearby restaurants (`ZADD`/`ZREVRANGE`).
- **Pub/Sub Adapter**: Scaling Socket.io WebSocket connections across processes.

---

## 📂 Folder & Directory Structure

```
food-app/
├── README.md
├── docker-compose.yml
├── db-blueprint.svg
├── rag-workflow.svg
├── backend/
│   ├── .env.example
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── package.json
│   ├── tsconfig.json
│   ├── db/
│   │   ├── schema.sql
│   │   ├── migrate.ts
│   │   └── seed.ts
│   ├── scripts/
│   │   └── testEmail.ts
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── bull-board.ts
│       ├── config/
│       │   ├── cloudinary.ts
│       │   ├── constants.ts
│       │   ├── db.ts
│       │   ├── env.ts
│       │   ├── logger.ts
│       │   ├── mailer.ts
│       │   └── redis.ts
│       ├── jobs/
│       │   └── cleanup.job.ts
│       ├── middlewares/
│       │   ├── auth.middleware.ts
│       │   ├── error.middleware.ts
│       │   ├── rateLimit.middleware.ts
│       │   ├── rbac.middleware.ts
│       │   ├── upload.middleware.ts
│       │   └── validate.middleware.ts
│       ├── modules/
│       │   ├── auth/
│       │   ├── capacity/
│       │   ├── cart/
│       │   ├── delivery/
│       │   ├── menu/
│       │   ├── orders/
│       │   ├── payments/
│       │   ├── restaurants/
│       │   ├── search/
│       │   └── users/
│       ├── queues/
│       │   ├── connection.ts
│       │   ├── email.queue.ts
│       │   ├── index.ts
│       │   ├── ingest.queue.ts
│       │   ├── notification.queue.ts
│       │   └── order.queue.ts
│       ├── realtime/
│       │   ├── handlers/
│       │   ├── socket.auth.ts
│       │   ├── socket.events.ts
│       │   └── socket.ts
│       ├── utils/
│       │   ├── apiError.ts
│       │   ├── apiResponse.ts
│       │   ├── asyncHandler.ts
│       │   └── idempotency.ts
│       └── workers/
│           ├── email.worker.ts
│           ├── index.ts
│           ├── ingest.worker.ts
│           ├── notification.worker.ts
│           └── order.worker.ts
└── frontend/
    ├── .env.local
    ├── Dockerfile
    ├── next.config.ts
    ├── package.json
    ├── postcss.config.mjs
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── admin/
        │   ├── cart/
        │   ├── checkout/
        │   ├── dashboard/
        │   │   ├── delivery/
        │   │   └── restaurant/
        │   ├── login/
        │   ├── orders/
        │   ├── register/
        │   ├── restaurants/
        │   ├── search/
        │   ├── globals.css
        │   ├── layout.tsx
        │   └── page.tsx
        ├── components/
        │   ├── DashboardSidebar.tsx
        │   ├── Footer.tsx
        │   ├── GoogleSignInButton.tsx
        │   ├── LiveDeliveryMap.tsx
        │   └── TopNavBar.tsx
        ├── hooks/
        │   └── useOrderTracking.ts
        ├── lib/
        │   ├── api.ts
        │   ├── socket.ts
        │   └── types.ts
        ├── providers/
        │   ├── QueryProvider.tsx
        │   └── ThemeProvider.tsx
        └── store/
            ├── authStore.ts
            └── cartStore.ts
```

---

## 🚀 Setup & Installation Instructions

### Prerequisites
- **Node.js**: v18+ or v20+
- **Docker**: For running Redis locally (`docker compose up -d`)
- **PostgreSQL**: PostgreSQL 15+ database (e.g. Supabase with `pgvector` enabled)

### Step 1: Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/vedantb23/forkflow.git
cd food-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` in `backend/` and configure variables.  
Create `.env.local` in `frontend/` (see section below).

### Step 3: Run Database Migrations & Seed Data
```bash
cd backend

# Execute schema migration
npm run db:migrate

# Seed sample restaurants, menus, and users
npm run db:seed
```

### Step 4: Start Infrastructure & Application
```bash
# Terminal 1: Start Redis container (from root directory)
docker compose up -d

# Terminal 2: Start Backend API & Realtime Server
cd backend
npm run dev

# Terminal 3: Start Queue Workers Process
cd backend
npm run worker

# Terminal 4: Start Next.js Frontend Application
cd frontend
npm run dev
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`
- **Bull Board Queue Dashboard**: `http://localhost:4000/admin/queues`

---

## 🔑 Environment Variables Reference

### Backend Configuration (`backend/.env`)

```env
# Server Configuration
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:3000

# Redis Cache & Queue Connection
REDIS_URL=redis://localhost:6379

# Database Connections (PostgreSQL / Supabase)
DATABASE_URL=postgresql://user:password@host:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/postgres

# Authentication & Security
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Image Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Dispatcher (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_app_password

# RAG & AI Vector Search
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

### Frontend Configuration (`frontend/.env.local`)

```env
# API & WebSocket Endpoints
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# OAuth Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```
