# ForkFlow — Complete Build Workflow (Flowchart)

> Visual, day-wise + step-wise map of the entire project. Read this alongside `TODO.md` (the checklist) and `README.md` (the rules & architecture).
> Legend: `📎` = user does a setup/signup · `⌨️` = a terminal command (agent must ASK first — README rule #11) · `✅` = verify before moving on.

---

## 🗺️ Master Pipeline (the whole project in one view)

```
          ┌──────────────────────────── BACKEND (Days 1–5) ────────────────────────────┐
          │                                                                             │
 DAY 1          DAY 2           DAY 3              DAY 4              DAY 5
 Foundation ─▶  Auth &     ─▶   Restaurants &  ─▶  Cart, Slots,  ─▶  Queues &
 & Database     Users           Menus + Cache      Orders, RACE       Workers
   │              │               │                   │                 │
   │ Supabase     │ Google OAuth  │ Cloudinary        │ Redis lock      │ BullMQ + Mailtrap
   │ Redis        │ JWT + RBAC    │ cache-aside       │ capacity slots  │ idempotency + DLQ
   ▼              ▼               ▼                   ▼                 ▼
 schema live    login works    CRUD + cache      1 winner proven   order pipeline live
                                                                        │
          ┌──────────────── FRONTEND (Day 6) ────────────────┐         │
          │                                                  ▼         ▼
 DAY 6                                            DAY 7
 Socket.io + Next.js UI  ──────────────────────▶ RAG + Polish + Deploy
   │                                               │
   │ live order tracking                           │ 📎 pgvector + Gemini
   ▼                                               ▼
 end-to-end product                            concierge search → SHIP 🎉
```

**Golden rule of the flow:** nothing real-time (Day 6) or RAG (Day 7) starts until the backend data + order pipeline (Days 1–5) is solid.

---

## 📅 DAY 1 — Foundation, Infra & Database

```
START
  │
  ▼
[1] Scaffold repo ── root files (.gitignore, docker-compose.yml) + backend/ + frontend/
  │
  ▼
⌨️ [2] npm init + install deps (express, pg, ioredis, bullmq, jwt...)
  │        (ASK user to run, explain each package group)
  ▼
[3] tsconfig + npm scripts (dev / worker / build)
  │
  ▼
[4] Backend skeleton ── config/(env,logger,constants) + utils + error middleware
  │                     + app.ts + server.ts (/health route)
  ▼
⌨️ ✅ npm run dev  →  GET /health = {status:"ok"}
  │
  ▼
📎 [5] SETUP REDIS (Docker) ── docker compose up -d redis
  │        explain: "Redis = fast in-memory store for cache/locks/queues"
  ▼
[6] config/redis.ts ── connect ioredis  → ✅ logs "Redis connected"
  │
  ▼
📎 [7] SETUP SUPABASE ── create project → copy DATABASE_URL (6543) + DIRECT_URL (5432)
  │        explain: "Supabase = hosted Postgres with a dashboard"
  ▼
[8] db/schema.sql (all tables + enums) + config/db.ts (pg Pool)
  │
  ▼
⌨️ [9] npm run db:migrate  → ✅ tables show in Supabase Table Editor
  │
  ▼
⌨️ [10] db/seed.ts → npm run db:seed  → ✅ 3 restaurants + menus in DB
  │
  ▼
END DAY 1 ✅  (health live · Redis connected · schema migrated + seeded)
```

---

## 📅 DAY 2 — Authentication, Users & Roles

```
START
  │
  ▼
📎 [1] SETUP GOOGLE OAUTH ── console → OAuth client → Client ID + Secret
  │        + generate JWT_SECRET (openssl rand -hex 32)
  ▼
[2] auth/ module
  │   ├─ auth.types.ts     (TS types + hand-written register/login validators)
  │   ├─ auth.service.ts   (bcrypt hash · verify · issue JWT · google verify)
  │   ├─ auth.controller.ts
  │   └─ auth.routes.ts    (POST /auth/register · /auth/login · GET /auth/me)
  ▼
[3] middlewares ── auth.middleware (verify JWT) · rbac.middleware (roles) · validate (hand-written)
  │
  ▼
[4] users/ module ── profile get/update · admin list
  │
  ▼
⌨️ ✅ Postman flow: register → login (JWT) → /auth/me with token → 200
  │                  CUSTOMER hits admin route → 403 (RBAC works)
  ▼
END DAY 2 ✅  (email + Google-ready auth · JWT · roles enforced)
```

---

## 📅 DAY 3 — Restaurants, Menus & Redis Caching

```
START
  │
  ▼
📎 [1] SETUP CLOUDINARY ── cloud name + api key + secret
  │
  ▼
[2] restaurants/ module ── CRUD (owner-scoped) + image upload to Cloudinary
  │
  ▼
[3] menu/ module ── CRUD menu items (price, isVeg, spiceLevel, stock)
  │
  ▼
[4] CACHING (today's real lesson)
  │   explain: "cache-aside = check Redis first; on miss, read DB then store in Redis"
  │
  ▼
      GET /restaurants ─▶ [Redis has it?] ──yes──▶ return cached  (log "HIT")
                              │ no
                              ▼
                          read DB ─▶ store in Redis (TTL) ─▶ return  (log "MISS")

  On create/update/delete ─▶ DELETE the Redis key (invalidate)
  │
  ▼
[5] rateLimit.middleware (Redis) on public list endpoints
  │
  ▼
⌨️ ✅ 1st GET = MISS · 2nd GET = HIT · after update = busted → MISS again
  │
  ▼
END DAY 3 ✅  (CRUD + images + cache-aside with invalidation)
```

---

## 📅 DAY 4 — Cart, Capacity Slots, Orders & the CONCURRENCY CORE ⭐

```
START
  │
  ▼
[1] cart/ module ── add/remove/update items · get active cart · clear
  │
  ▼
[2] capacity/ module (the unique bit)
  │   explain: "a kitchen cooks only N orders per 15-min window = limited slots"
  │   capacity.slots.ts  → current window key  restaurant:{id}:slot:{window}
  │   capacity.service.ts → reserveSlot() = atomic DECR, reject if < 0
  ▼
[3] orders/ module ── the race handling
  │   order.lock.ts   → Redis lock (SET NX PX + Lua safe release)
  │   idempotency.ts  → Idempotency-Key stored in Redis
  │
  ▼
  placeOrder() FLOW:
  ┌────────────────────────────────────────────────────────────┐
  │  request + Idempotency-Key                                  │
  │        │                                                    │
  │        ▼                                                    │
  │  [seen key?] ──yes──▶ return SAME order (no double place)   │
  │        │ no                                                 │
  │        ▼                                                    │
  │  🔒 acquire lock on item(s) + slot                          │
  │        │                                                    │
  │        ▼                                                    │
  │  re-check stock & capacity INSIDE lock                      │
  │        │                                                    │
  │   ┌────┴────┐                                               │
  │   ▼         ▼                                               │
  │  ok       none left ──▶ reject "out of stock/slot full"     │
  │   │                                                         │
  │   ▼                                                         │
  │  create order(PENDING) + DECR stock/slot                    │
  │   │                                                         │
  │   ▼                                                         │
  │  🔓 release lock ──▶ (Day 5: enqueue job; today inline)     │
  └────────────────────────────────────────────────────────────┘
  │
  ▼
⌨️ ✅ scripts/raceTest.ts ── 20 concurrent orders, stock=1 → EXACTLY 1 wins, 19 rejected
  │
  ▼
END DAY 4 ✅  (exactly-one-winner PROVEN · slots enforced)
```

---

## 📅 DAY 5 — BullMQ Queues, Workers, Idempotency & Reliability

```
START
  │
  ▼
[1] queues/ (producers) ── connection.ts + order.queue + email.queue + notification.queue
  │   explain: "a queue = to-do list in Redis; API drops a job, a worker picks it up later"
  ▼
[2] order.service now ENQUEUES the order job (stops processing inline)
  │
  ▼
[3] workers/ (SEPARATE process — `npm run worker`)
  │
  ▼
   ORDER PIPELINE:
   API ──enqueue──▶ [orderQueue] ──▶ order.worker (one at a time, in order)
                                        │
                                        ▼
                                 idempotent? ──already done──▶ skip
                                        │ no
                                        ▼
                                 payment.service (mock, idempotent)
                                        │
                                        ├─ success ─▶ status CONFIRMED→PREPARING
                                        │              └─ enqueue email + notification
                                        └─ fail ─▶ retry (exp backoff) ─▶ still fail ─▶ DLQ
  │
  ▼
📎 [4] SETUP EMAIL (Mailtrap) ── SMTP host/port/user/pass
  │
  ▼
[5] email.worker (Nodemailer) · notification.worker (placeholder → Socket.io on Day 6)
  │
  ▼
[6] bull-board.ts ── dashboard at /admin/queues · cleanup.job (expire stale carts)
  │
  ▼
⌨️ ✅ place order → worker runs → email in Mailtrap → job visible in Bull Board
  │
  ▼
END DAY 5 ✅  BACKEND COMPLETE (queue · idempotent · retry/DLQ · observable)
```

---

## 📅 DAY 6 — Real-time (Socket.io) + Frontend Integration

```
START
  │
  ▼
[1] Socket.io backend (realtime/)
  │   explain: "WebSocket = a phone line kept open; server can push updates instantly"
  │   socket.ts (io + Redis adapter) · socket.auth (JWT handshake) · events constants
  │   handlers/ order + delivery · notification.worker now EMITS status events
  ▼
   LIVE FLOW:  worker changes order status ──emit──▶ room order:{id} ──▶ browser updates (no refresh)
  │
  ▼
⌨️ [2] create-next-app + install (axios, socket.io-client, tanstack query, zustand, next-auth)
  │
  ▼
[3] frontend plumbing ── lib/(api,socket,auth) · providers (Query,Socket) · store/cartStore · hooks
  │
  ▼
[4] pages
  │   login/register ─▶ home (restaurant list) ─▶ restaurant/[id] (menu) ─▶ cart ─▶ checkout
  │        │                                                                        │
  │        └──────────────── orders/[id] = LIVE tracking timeline ◀────────────────┘
  │   + restaurant dashboard (incoming orders live) + delivery dashboard
  ▼
⌨️ ✅ browse → cart → checkout → watch status change live without refresh
  │
  ▼
END DAY 6 ✅  full product working end-to-end
```

---

## 📅 DAY 7 — RAG (LAST), Polish, Docs & Deploy

```
START
  │
  ▼
📎 [1] SETUP ── enable pgvector on Supabase + get GEMINI_API_KEY
  │   explain: "embeddings = turn text into numbers so we can search by MEANING, not keywords"
  ▼
[2] schema ── add embedding vector(768) to MenuItem + ivfflat index (raw SQL migration)
  │
  ▼
[3] INGESTION:  each menu item ─▶ text blob (name+desc+veg+spice+price) ─▶ Gemini embed ─▶ store vector
  │
  ▼
[4] QUERY pipeline (search/ module):
  │
  ▼
   user: "spicy veg under ₹200, ready in 30 min"
        │
        ▼
   embed query ─▶ pgvector cosine search (filter veg/price) ─▶ top-K dishes
        │
        ▼
   pass dishes as context ─▶ Gemini ─▶ natural-language answer + which dishes used
        │
        ▼
   cache result in Redis (same question = instant)
  │
  ▼
[5] frontend search/page.tsx + SearchBar ── the concierge UI
  │
  ▼
[6] POLISH ── rich seed + re-ingest · Dockerfiles · docker-compose · CI · README screenshots · demo video
  │
  ▼
⌨️ [7] DEPLOY ── frontend→Vercel · backend+worker→Railway/Render · Redis→Upstash · DB=Supabase
  │
  ▼
END DAY 7 ✅  RAG concierge live · dockerized · deployed · documented  🎉 SHIP
```

---

## 🔁 Key Runtime Flows (reference — how the finished app behaves)

**Placing an order (the money shot):**
```
Customer ─▶ POST /orders (+Idempotency-Key)
        ─▶ Redis lock + capacity check  ─▶ Order(PENDING) in Postgres
        ─▶ enqueue job (BullMQ)
Worker  ─▶ payment ─▶ status updates ─▶ emit Socket.io ─▶ enqueue email
Customer browser ─▶ live timeline updates  ·  inbox ─▶ confirmation email
```

**Why each tech fired:** Postgres = durable order · Redis lock = no double-sell · BullMQ = fair + reliable processing · Socket.io = live tracking · Nodemailer-via-worker = email off the request path · (Day 7) RAG = discovery.

---

## ✅ Daily Exit Gates (don't advance until green)
| Day | Must be true to move on |
|-----|--------------------------|
| 1 | `/health` OK · Redis connected · schema migrated + seeded |
| 2 | register/login/JWT work · RBAC returns 403 for wrong role |
| 3 | CRUD works · cache HIT/MISS + invalidation proven |
| 4 | **raceTest: exactly 1 winner** · slots enforced |
| 5 | order → queue → worker → payment → email · Bull Board shows jobs |
| 6 | end-to-end order with **live tracking, no refresh** |
| 7 | RAG returns grounded results · deployed · docs done |
```
