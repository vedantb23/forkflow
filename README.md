# ForkFlow 🍴

A production-grade, full-stack **food ordering & delivery platform** built to demonstrate real backend engineering — not a CRUD clone.

The whole point of ForkFlow is that **every technology in the stack is essential, not bolted on.** The domain naturally forces hard problems: concurrent orders fighting for the last item, kitchens that can only cook so many orders per time-window, live "where's my food" tracking, and natural-language menu discovery. Each of those maps to exactly one tool below.

> 📄 **Project files:** `README.md` (this — rules, stack, architecture, folder tree) · `TODO.md` (7-day checklist) · `WORKFLOW.md` (day-wise + step-wise flowcharts of the whole build).

---

## 📌 IMPORTANT NOTES — READ THIS FIRST (for any developer or AI agent)

> **This section is law. Any agent (Claude, Antigravity, Cursor, a human) continuing this project MUST obey these rules so the result is identical regardless of who builds it.**

1. **Build order is fixed: BACKEND FIRST, then FRONTEND, then RAG LAST.** Do not start RAG (the `search/` module + pgvector) until Day 7. It depends on menu data existing and clutters early testing.
2. **Follow `TODO.md` day-by-day, top-to-bottom.** Each task has a checkbox. Only check a box when the task is actually done and verified (server runs / endpoint returns / test passes). Never check a box for partial work.
3. **This is a *modular monolith*, not microservices.** One backend process serves HTTP; a *separate* worker process consumes queues. Do not split modules into separate services.
4. **Language is TypeScript everywhere.** No plain `.js` source files in `src/`.
5. **Every external service (Supabase, Redis, Google OAuth, Cloudinary, Gemini) is set up ON THE DAY IT IS FIRST NEEDED** — the exact "go here → get key → paste into `.env`" steps live inside `TODO.md` for that day. Do not front-load all signups on Day 1.
6. **Secrets live ONLY in `.env` (backend) and `.env.local` (frontend).** These are gitignored. `.env.example` / `.env.local.example` are committed with empty values and every key documented.
7. **When an agent codes a step, it MUST pause and give the user the setup instructions** (e.g. "open Supabase → Project Settings → Database → copy the connection string → paste into `DATABASE_URL`") **before** relying on that key. The user is new to Supabase/OAuth — explain in depth, step by step.
8. **Naming conventions are strict** (see [Naming Conventions](#-naming-conventions)). A file named wrong = the build is wrong.
9. **Idempotency and the Redis lock are non-negotiable** on the order path. The "two orders, one item" race is the centerpiece of this project — it must actually work, provably.
10. **Keep commits small and per-task.** One TODO checkbox ≈ one commit.
11. **NEVER run a terminal command silently. ASK FIRST.** Before running ANY command (npm install, docker, prisma, git, running the server, etc.) the agent MUST stop and tell the user: (a) the exact command, (b) *what* it does, (c) *why* we run it now, (d) what a successful result looks like. Wait for the user to run it (or approve) before continuing. The user runs commands and reports back the output/errors.
12. **TEACH WHILE BUILDING — the user is learning, not just receiving code.** For every step the agent MUST narrate: *what* it is about to do, *why* this step exists, and *how* it fits the bigger picture. After a step, if an error occurred, explain **what the error was, why it happened, and how it was fixed** — do not silently patch things. The user must be able to follow the reasoning at every point.
13. **The user is NEW to Docker, Redis, and Socket.io** (tutorials only, jumped into the project due to time). Whenever these appear, explain the concept in plain language *before* the code — e.g. "a Redis lock is like taking a key so only one order can touch the last item at a time." Never assume prior hands-on familiarity with these three.
14. **EVERY line of code gets an inline comment explaining what it does**, written for a learner. Keep code broken into small, ordered steps (Step 1, Step 2, …) with a short comment above each block explaining the *why*, and an inline `//` comment on individual lines explaining the *what*. The user will strip the comments later — during the build they are mandatory. Prefer many small commented pieces over one large uncommented file.

---

## 🎯 What Makes ForkFlow Unique (the interview story)

Most food-app clones just decrement a stock counter. ForkFlow models the thing that actually breaks real food platforms:

- **Kitchen-capacity-aware ordering.** A kitchen can only cook ~N orders per 15-minute window. Placing an order isn't "decrement stock" — it's **allocating a limited throughput slot in a time-window.** Two customers competing for the last slot in the 1:00–1:15 window is a genuinely harder concurrency problem than "last burger," and it makes prep-time ETAs *real* instead of fake.
- **Provable no-double-allocation** under concurrent load, via Redis distributed lock + a serialized BullMQ order queue.
- **Idempotent order processing** — a retried/duplicated request never double-charges or double-places.
- **RAG concierge** — "something spicy, veg, under ₹200, ready in 30 min" answered over real menu data, as a *feature inside* the app, not the whole app.

---

## 🧱 Tech Stack — and WHY each piece exists

| Layer | Technology | Why it's here (the problem it solves) |
|-------|-----------|----------------------------------------|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR for fast restaurant listings, server actions, one framework for all roles (customer/restaurant/delivery) |
| | Tailwind CSS + shadcn/ui | Fast, consistent UI |
| | TanStack Query | Server-state caching, avoids redundant refetches |
| | Zustand | Lightweight client cart state |
| | Socket.io-client | Receives live order/delivery updates |
| **Auth** | NextAuth.js v5 (Google OAuth + credentials) + JWT | Login with Google or email; backend verifies JWT on every request |
| **Backend** | Node.js + Express + TypeScript | REST API, modular monolith |
| **ORM** | Prisma | Type-safe DB access, migrations, clean schema |
| **Database** | PostgreSQL (via **Supabase**) | Deeply relational + transactional data (users, restaurants, menus, orders, payments) |
| **Vector search** | pgvector (Supabase extension) | Stores menu embeddings for RAG — no separate vector DB needed |
| **Cache / Locks / Rankings** | Redis (via ioredis) | See Redis breakdown below |
| **Queue** | **BullMQ** (on Redis) | Serializes & retries order processing, sends emails/notifications reliably off the request path |
| **Real-time** | Socket.io (standalone server) + Redis adapter | Live order tracking, kitchen status, delivery location |
| **RAG** | LangChain.js + Google Gemini API | Natural-language menu search + dietary Q&A (Day 7 only) |
| **File storage** | Cloudinary | Restaurant / dish images |
| **Email** | Nodemailer (fired only from a BullMQ worker) | Order confirmations, status emails |
| **Monitoring** | Bull Board | Visual dashboard for queue health |
| **DevOps** | Docker + Docker Compose | One-command local stack (backend, worker, Postgres-or-Supabase, Redis) |
| | GitHub Actions | CI: lint + typecheck + build |

### What each Redis role is doing (Redis is used 5 ways)
| Redis feature | Use in ForkFlow |
|---------------|-----------------|
| **Cache (cache-aside)** | Restaurant lists & menus are read-heavy, rarely change → cached, invalidated on update |
| **Distributed lock** | Lock a menu-item / capacity-slot so two orders can't grab the last unit |
| **Atomic counters (INCR/DECR)** | Live inventory & remaining capacity slots |
| **Sorted sets (ZADD/ZREVRANGE)** | "Nearby / trending restaurants" and popularity rankings |
| **Pub/Sub** | Socket.io adapter so real-time works across multiple server instances |

### Why BullMQ (short, interview-ready)
> BullMQ is a Redis-backed job queue. When a customer places an order, we don't process it inline on the HTTP request — we **enqueue a job**. A separate **worker process** pulls jobs **one at a time in arrival order**, which gives us: (1) **fairness** — first-come-first-served on the last item, (2) **retries with exponential backoff** if payment/DB hiccups, (3) a **dead-letter queue** for jobs that fail permanently, (4) **idempotency** — a retried job checks "did I already process this order?" and no-ops if so, and (5) it keeps the API **fast** because slow work (emails, notifications) happens in the background. Bull Board gives us a live dashboard of the queue.

---

## 🏗️ System Architecture

```
                         ┌──────────────────────────────┐
                         │        Next.js Frontend        │
                         │  (customer / restaurant /      │
                         │   delivery dashboards)         │
                         └───────┬───────────────┬────────┘
                        REST/JWT │               │ WebSocket
                                 ▼               ▼
                    ┌─────────────────┐   ┌──────────────────┐
                    │  Express API     │   │  Socket.io Server │
                    │ (modular monolith)│  │ (live tracking)   │
                    └───┬─────────┬────┘   └────────┬─────────┘
             enqueue    │         │ cache/lock       │ pub/sub
              jobs      │         ▼                  ▼
                        │   ┌──────────────────────────────┐
                        │   │            Redis              │
                        │   │ cache · locks · counters ·    │
                        │   │ sorted sets · pub/sub · BullMQ│
                        │   └──────────────┬───────────────┘
                        ▼                  │ consumes jobs
                  ┌───────────┐            ▼
                  │ PostgreSQL│      ┌──────────────┐
                  │ (Supabase)│◄─────│ Worker Process│
                  │ +pgvector │      │ (BullMQ)      │
                  └───────────┘      │ order·email·  │
                                     │ notification  │
                                     └──────────────┘
```

Two Node processes: **`server.ts`** (API + Socket.io) and **`workers/index.ts`** (BullMQ consumers). Both talk to the same Redis + Postgres.

---

## 📂 Full Folder & File Structure

> Every file that will exist by the end of the project is listed. Files created on later days are marked `(Day N)`.

```
food-app/
├── README.md
├── TODO.md
├── docker-compose.yml
├── .gitignore
│
├── backend/
│   ├── .env.example
│   ├── .env                         # gitignored, you create it
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── prisma/
│   │   ├── schema.prisma            # all DB models + pgvector
│   │   ├── seed.ts                  # sample restaurants/menus
│   │   └── migrations/              # auto-generated by Prisma
│   └── src/
│       ├── app.ts                   # express app (middleware, routes mount)
│       ├── server.ts                # HTTP + Socket.io bootstrap
│       │
│       ├── config/
│       │   ├── env.ts               # loads & validates env vars
│       │   ├── prisma.ts            # PrismaClient singleton
│       │   ├── redis.ts             # ioredis connection(s)
│       │   ├── logger.ts            # pino logger
│       │   └── constants.ts         # slot size, cache TTLs, queue names
│       │
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.routes.ts
│       │   │   └── auth.types.ts
│       │   ├── users/
│       │   │   ├── user.controller.ts
│       │   │   ├── user.service.ts
│       │   │   ├── user.routes.ts
│       │   │   └── user.types.ts
│       │   ├── restaurants/
│       │   │   ├── restaurant.controller.ts
│       │   │   ├── restaurant.service.ts
│       │   │   ├── restaurant.routes.ts
│       │   │   ├── restaurant.cache.ts     # cache-aside logic
│       │   │   └── restaurant.types.ts
│       │   ├── menu/
│       │   │   ├── menu.controller.ts
│       │   │   ├── menu.service.ts
│       │   │   ├── menu.routes.ts
│       │   │   ├── menu.cache.ts
│       │   │   └── menu.types.ts
│       │   ├── cart/
│       │   │   ├── cart.controller.ts
│       │   │   ├── cart.service.ts
│       │   │   ├── cart.routes.ts
│       │   │   └── cart.types.ts
│       │   ├── capacity/                    # kitchen time-window slots
│       │   │   ├── capacity.service.ts
│       │   │   ├── capacity.slots.ts        # slot math + Redis counters
│       │   │   └── capacity.types.ts
│       │   ├── orders/
│       │   │   ├── order.controller.ts
│       │   │   ├── order.service.ts
│       │   │   ├── order.routes.ts
│       │   │   ├── order.lock.ts            # Redis distributed lock
│       │   │   └── order.types.ts
│       │   ├── delivery/
│       │   │   ├── delivery.controller.ts
│       │   │   ├── delivery.service.ts
│       │   │   ├── delivery.routes.ts
│       │   │   └── delivery.types.ts
│       │   ├── payments/
│       │   │   ├── payment.controller.ts
│       │   │   ├── payment.service.ts       # mock gateway (idempotent)
│       │   │   ├── payment.routes.ts
│       │   │   └── payment.types.ts
│       │   └── search/                      # RAG — DAY 7 ONLY
│       │       ├── search.controller.ts     # (Day 7)
│       │       ├── search.service.ts        # (Day 7)
│       │       ├── search.routes.ts         # (Day 7)
│       │       ├── rag.embeddings.ts        # (Day 7) Gemini embeddings
│       │       ├── rag.ingest.ts            # (Day 7) menu → chunks → pgvector
│       │       ├── rag.query.ts             # (Day 7) retrieve + generate
│       │       └── search.types.ts          # (Day 7)
│       │
│       ├── queues/
│       │   ├── connection.ts        # shared BullMQ Redis connection
│       │   ├── order.queue.ts       # producer: add order jobs
│       │   ├── email.queue.ts       # producer: add email jobs
│       │   ├── notification.queue.ts
│       │   └── index.ts
│       │
│       ├── workers/
│       │   ├── order.worker.ts      # consumes order queue (the core)
│       │   ├── email.worker.ts
│       │   ├── notification.worker.ts
│       │   └── index.ts             # boots all workers (separate process)
│       │
│       ├── realtime/
│       │   ├── socket.ts            # io server init + Redis adapter
│       │   ├── socket.auth.ts       # JWT handshake auth
│       │   ├── socket.events.ts     # event name constants
│       │   └── handlers/
│       │       ├── order.handler.ts
│       │       └── delivery.handler.ts
│       │
│       ├── middlewares/
│       │   ├── auth.middleware.ts   # verify JWT, attach user
│       │   ├── rbac.middleware.ts   # role check (customer/restaurant/...)
│       │   ├── error.middleware.ts  # central error handler
│       │   ├── rateLimit.middleware.ts
│       │   └── validate.middleware.ts  # zod validation
│       │
│       ├── jobs/
│       │   └── cleanup.job.ts       # scheduled: expire stale carts/holds
│       │
│       ├── utils/
│       │   ├── apiResponse.ts       # standard success shape
│       │   ├── apiError.ts          # typed errors
│       │   ├── asyncHandler.ts      # async route wrapper
│       │   └── idempotency.ts       # idempotency-key helper (Redis)
│       │
│       └── bull-board.ts            # queue dashboard at /admin/queues
│
└── frontend/
    ├── .env.local.example
    ├── .env.local                   # gitignored, you create it
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── Dockerfile
    ├── public/
    │   └── (images, icons)
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── globals.css
        │   ├── page.tsx                     # home: restaurant list
        │   ├── (auth)/
        │   │   ├── login/page.tsx
        │   │   └── register/page.tsx
        │   ├── (customer)/
        │   │   ├── restaurants/[id]/page.tsx # menu + order
        │   │   ├── cart/page.tsx
        │   │   ├── checkout/page.tsx
        │   │   ├── orders/page.tsx
        │   │   ├── orders/[id]/page.tsx      # LIVE tracking
        │   │   └── search/page.tsx           # RAG concierge (Day 7)
        │   ├── (restaurant)/
        │   │   ├── dashboard/page.tsx
        │   │   ├── menu/page.tsx
        │   │   └── orders/page.tsx           # incoming orders live
        │   ├── (delivery)/
        │   │   └── dashboard/page.tsx
        │   └── api/
        │       └── auth/[...nextauth]/route.ts
        │
        ├── components/
        │   ├── ui/                           # shadcn primitives
        │   ├── layout/
        │   │   ├── Navbar.tsx
        │   │   └── Footer.tsx
        │   ├── restaurant/
        │   │   ├── RestaurantCard.tsx
        │   │   └── RestaurantList.tsx
        │   ├── menu/
        │   │   ├── MenuItem.tsx
        │   │   └── MenuList.tsx
        │   ├── cart/
        │   │   ├── CartDrawer.tsx
        │   │   └── CartItem.tsx
        │   ├── order/
        │   │   ├── OrderStatusTimeline.tsx    # live status
        │   │   └── OrderCard.tsx
        │   └── search/
        │       └── SearchBar.tsx              # RAG UI (Day 7)
        │
        ├── lib/
        │   ├── api.ts                # axios instance + interceptors
        │   ├── socket.ts             # socket.io-client singleton
        │   ├── auth.ts               # NextAuth config
        │   └── utils.ts
        │
        ├── hooks/
        │   ├── useSocket.ts
        │   ├── useCart.ts
        │   └── useOrderTracking.ts
        │
        ├── store/
        │   └── cartStore.ts          # Zustand
        │
        ├── providers/
        │   ├── QueryProvider.tsx
        │   └── SocketProvider.tsx
        │
        └── types/
            └── index.ts
```

---

## 🔑 Environment Variables

### `backend/.env`
```env
# --- Server ---
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:3000

# --- Database (Supabase Postgres) — set up Day 1 ---
DATABASE_URL=              # Supabase → Settings → Database → Connection string (URI, port 6543 pooled)
DIRECT_URL=               # Supabase → same page → Direct connection (port 5432) for migrations

# --- Redis — set up Day 1 ---
REDIS_URL=redis://localhost:6379

# --- JWT — Day 2 ---
JWT_SECRET=                # any long random string (openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# --- Google OAuth — Day 2 ---
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# --- Cloudinary — Day 3 ---
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# --- Email (Nodemailer) — Day 5 ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# --- Gemini (RAG) — Day 7 ---
GEMINI_API_KEY=
```

### `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=            # openssl rand -hex 32
GOOGLE_CLIENT_ID=           # same as backend
GOOGLE_CLIENT_SECRET=       # same as backend
```

---

## 🗄️ Core Data Model (high level — full schema in `prisma/schema.prisma`, built Day 1)

- **User** — id, email, name, role (`CUSTOMER | RESTAURANT_OWNER | DELIVERY | ADMIN`), avatar
- **Restaurant** — id, ownerId, name, description, cuisine, location, isOpen, prepSlotMinutes, maxOrdersPerSlot
- **MenuItem** — id, restaurantId, name, description, price, isVeg, spiceLevel, stock, imageUrl, embedding (`vector`, Day 7)
- **Cart / CartItem** — user's active cart
- **Order** — id, userId, restaurantId, status (`PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED / CANCELLED`), slotWindow, totalAmount, idempotencyKey
- **OrderItem** — orderId, menuItemId, qty, priceAtOrder
- **Payment** — orderId, status, amount, providerRef (mock, idempotent)
- **DeliveryAssignment** — orderId, deliveryPartnerId, status, live location

---

## ▶️ Quick Start (once code exists)

```bash
# 1. Clone & install
cd backend && npm install
cd ../frontend && npm install

# 2. Fill backend/.env and frontend/.env.local (see TODO.md for how to get each key)

# 3. Start infra (Redis) + generate DB
docker compose up -d redis
cd backend
npx prisma migrate dev      # creates tables in Supabase
npx prisma db seed          # sample data

# 4. Run (3 terminals)
npm run dev          # API + Socket.io   (terminal 1)
npm run worker       # BullMQ workers     (terminal 2)
cd ../frontend && npm run dev   # Next.js  (terminal 3)

# Frontend: http://localhost:3000
# API:      http://localhost:4000
# Queues:   http://localhost:4000/admin/queues
```

---

## 📛 Naming Conventions

- **Folders:** lowercase, singular for a domain concept (`order/`, `menu/`), plural only where it reads naturally (`modules/`, `workers/`).
- **Backend files:** `<domain>.<layer>.ts` → `order.service.ts`, `order.controller.ts`, `order.routes.ts`, `order.types.ts`.
- **React components:** `PascalCase.tsx` → `RestaurantCard.tsx`.
- **Hooks:** `useThing.ts`. **Zustand stores:** `thingStore.ts`.
- **Queue names / event names:** UPPER_SNAKE constants in `constants.ts` / `socket.events.ts` — never hardcode strings.
- **Env vars:** UPPER_SNAKE; public frontend vars prefixed `NEXT_PUBLIC_`.

---

## 🗓️ 7-Day Plan (summary — full checklist in `TODO.md`)

| Day | Focus | Outcome |
|-----|-------|---------|
| **1** | Foundation & Infra | Repo scaffold, Docker, **Supabase setup**, Prisma schema + migrate, Redis connected |
| **2** | Auth & Users | **Google OAuth setup**, JWT, register/login, RBAC roles |
| **3** | Restaurants & Menus + Caching | CRUD, **Cloudinary setup**, Redis cache-aside + invalidation |
| **4** | Cart, Orders & Concurrency | Cart, **capacity slots**, **Redis lock**, the two-orders-one-item race |
| **5** | Queues & Workers | **BullMQ** order/email/notification queues, idempotency, retries, Bull Board |
| **6** | Real-time + Frontend | **Socket.io** live tracking, wire up all Next.js pages |
| **7** | RAG + Polish | **Gemini setup**, pgvector, semantic menu search, seed demo, docs |

> Backend is Days 1–5, frontend integration is Day 6, **RAG is intentionally Day 7 (last).**

---

## ✅ Definition of Done (per feature)

A feature is done only when: code compiles (`tsc` clean) → endpoint tested (Postman/curl) → for order flow, the race condition demonstrably yields exactly one winner → the matching `TODO.md` box is checked → committed.

Now open **`TODO.md`** and start at Day 1, Task 1.
