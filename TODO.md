# ForkFlow — 7-Day Build Checklist

> **How to use this file (for any agent or developer):**
> - Companion files: `README.md` (rules + architecture) · `WORKFLOW.md` (day-wise + step-wise flowcharts of the whole build).
> - Work **top to bottom, one day at a time.** Do not skip ahead.
> - Check a box `[x]` ONLY when the task is done AND verified (compiles / endpoint responds / test passes).
> - **Setup blocks (📎) are for the USER.** When you (agent) reach one, STOP coding, paste the instructions to the user, wait for them to add the key to `.env`, then continue.
> - **RAG is Day 7. Do not touch `modules/search/` or pgvector before then.**
> - Backend = Days 1–5. Frontend integration = Day 6. RAG + polish = Day 7.
> - One task ≈ one commit.
> - **NEVER run a terminal command for the user silently.** Before every command, state the exact command, what it does, why now, and what success looks like — then wait for the user to run it and report back (README rule #11).
> - **Teach while building.** Narrate what/why/how for each step; on errors, explain what broke, why, and the fix. User is NEW to Docker/Redis/Socket.io — explain the concept before the code (README rules #12–13).
> - **Every line of code gets a learner-friendly comment**, broken into ordered Steps. User strips them later (README rule #14).

---

## 📅 DAY 1 — Foundation, Infra & Database

### Repo scaffold
- [x] Create root files: `README.md`, `TODO.md`, `.gitignore`, `docker-compose.yml`
- [x] `.gitignore` includes: `node_modules`, `.env`, `.env.local`, `dist`, `.next`, `*.log`
- [ ] Create `backend/` and `frontend/` folders  <!-- backend done; frontend deferred to Day 6 -->
- [x] `cd backend && npm init -y`
- [x] Install backend deps:
      `npm i express cors helmet cookie-parser dotenv ioredis bullmq pg pino pino-pretty jsonwebtoken bcryptjs`
- [x] Install backend dev deps:
      `npm i -D typescript tsx @types/node @types/express @types/cors @types/cookie-parser @types/jsonwebtoken @types/bcryptjs @types/pg`
- [x] `npx tsc --init` → set `outDir: ./dist`, `rootDir: ./src`, `strict: true`, `esModuleInterop: true`, `moduleResolution: nodenext` <!-- node10 removed in TS7 -->
- [x] Add npm scripts to `backend/package.json`:
      `"dev": "tsx watch src/server.ts"`, `"worker": "tsx watch src/workers/index.ts"`, `"build": "tsc"`, `"start": "node dist/server.js"`, `"db:migrate": "tsx db/migrate.ts"`, `"db:seed": "tsx db/seed.ts"`

### Backend skeleton
- [x] `src/config/env.ts` — load `dotenv`, validate required vars with plain TS checks, export typed `env`
- [x] `src/config/logger.ts` — pino logger
- [x] `src/config/constants.ts` — `SLOT_MINUTES=15`, cache TTLs, queue name constants
- [x] `src/utils/apiResponse.ts`, `src/utils/apiError.ts`, `src/utils/asyncHandler.ts`
- [x] `src/middlewares/error.middleware.ts` — central error handler
- [x] `src/app.ts` — express app: helmet, cors(CLIENT_URL), json, cookieParser, mount `/health` route
- [x] `src/server.ts` — start HTTP server on `PORT`, log startup
- [x] Verify: `npm run dev` → `GET http://localhost:4000/health` returns `{ status: "ok" }`

### 📎 SETUP: Redis (local via Docker)
> **Agent: give user this block.**
> 1. Ensure Docker Desktop is installed and running.
> 2. In root `docker-compose.yml` we define a `redis` service (image `redis:7-alpine`, port `6379`).
> 3. Run: `docker compose up -d redis`
> 4. Verify it's up: `docker ps` should show a redis container.
> 5. In `backend/.env` set `REDIS_URL=redis://localhost:6379`
- [x] Add `redis` service to `docker-compose.yml`
- [x] `docker compose up -d redis` and verify
- [x] `src/config/redis.ts` — create ioredis client, log "Redis connected"
- [x] Verify backend logs show Redis connected on boot

### 📎 SETUP: Supabase (PostgreSQL) — do this carefully, user is new
> **Agent: give user this ENTIRE block, step by step. Do not proceed until they paste the two URLs.**
>
> **What Supabase is:** a hosted PostgreSQL database with a nice dashboard. We use it purely as our Postgres DB (and later its pgvector extension for RAG).
>
> **Steps:**
> 1. Go to **https://supabase.com** → **Start your project** → sign in with GitHub.
> 2. Click **New Project**. Pick your org. Give it a name: `forkflow`. Choose a region close to you (e.g. Mumbai/Singapore). Set a **strong database password** — SAVE THIS PASSWORD somewhere, you'll need it.
> 3. Wait ~2 minutes for the project to provision.
> 4. Go to **Project Settings (gear icon) → Database**.
> 5. Scroll to **Connection string** → select the **URI** tab.
>    - There are two you need:
>      - **Transaction pooler** connection (host has `pooler`, port **6543**) → this is your `DATABASE_URL` (used by the app at runtime).
>      - **Direct connection** (port **5432**) → this is your `DIRECT_URL` (used by the migrate script to run raw SQL).
>    - Replace `[YOUR-PASSWORD]` in each string with the DB password you set in step 2.
> 6. Paste both into `backend/.env`:
>    ```
>    DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true"
>    DIRECT_URL="postgresql://...:5432/postgres"
>    ```
> 7. Tell the agent "done" and it will continue.
- [x] User has created Supabase project and pasted `DATABASE_URL` + `DIRECT_URL`

### Database — raw SQL (no ORM; `pg` driver)
- [x] `db/schema.sql` — enums (`role`, `order_status`, `payment_status`, `delivery_status`) + tables (`users`, `restaurants`, `menu_items`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `delivery_assignments`) + `updated_at` triggers (embedding column on menu_items added Day 7)
- [x] `src/config/db.ts` — shared `pg` Pool on `DATABASE_URL` + `query()` helper + `connectDb()` boot check
- [x] `db/migrate.ts` — runs `schema.sql` over `DIRECT_URL`; `npm run db:migrate`
- [x] Run `npm run db:migrate` → verify tables appear in Supabase → **Table Editor**
- [x] `db/seed.ts` — insert 1 owner + 3 sample restaurants with menus; `npm run db:seed`
- [x] Run `npm run db:seed` → verify seeded rows in Supabase Table Editor

**End of Day 1:** health endpoint live, Redis connected, Supabase schema migrated + seeded. ✅

---

## 📅 DAY 2 — Authentication, Users & Roles

### 📎 SETUP: Google OAuth credentials
> **Agent: give user this block. Needed for Google login.**
> 1. Go to **https://console.cloud.google.com** → create a new project `forkflow` (top bar project selector → New Project).
> 2. Left menu → **APIs & Services → OAuth consent screen** → choose **External** → fill app name `ForkFlow`, your email → Save (you can skip scopes/test users for dev, just add your own email as a test user).
> 3. Left menu → **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
> 4. Application type: **Web application**. Name: `forkflow-web`.
> 5. **Authorized JavaScript origins:** add `http://localhost:3000`
> 6. **Authorized redirect URIs:** add `http://localhost:3000/api/auth/callback/google`
> 7. Click Create → copy **Client ID** and **Cl       ient secret**.
> 8. Paste into `backend/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) AND `frontend/.env.local` (same two values).
> 9. Also generate a JWT secret: run `openssl rand -hex 32` → paste into `JWT_SECRET`.
- [ ] User has pasted `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`

### Auth module (`modules/auth/`)
- [x] `auth.types.ts` — TS types + hand-written validators for register/login payloads
- [x] `auth.service.ts` — `register` (hash w/ bcrypt), `login` (verify, issue JWT), `verifyGoogleToken` <!-- Google upsert built (loginWithGoogle); real token verify wired Day 6 w/ frontend -->
- [x] `auth.controller.ts` — register/login/me handlers using `asyncHandler`
- [x] `auth.routes.ts` — `POST /auth/register`, `POST /auth/login`, `GET /auth/me` <!-- + POST /auth/logout -->
- [x] `src/middlewares/auth.middleware.ts` — verify JWT from header/cookie, attach `req.user`
- [x] `src/middlewares/rbac.middleware.ts` — `requireRole(...roles)`
- [x] `src/middlewares/validate.middleware.ts` — hand-written body validation (checks required fields/types, throws ApiError.badRequest on failure)
- [x] Mount auth routes in `app.ts`

### Users module (`modules/users/`)
- [x] `user.service.ts` — get profile, update profile, list (admin)
- [x] `user.controller.ts`, `user.routes.ts` (protected by auth middleware)
- [x] Verify with Postman: register → login (get JWT) → `GET /auth/me` with token → `GET /users/me`
- [x] Verify RBAC: a CUSTOMER hitting an admin route → 403

**End of Day 2:** full auth (email + Google-ready), JWT, roles enforced. ✅

---

## 📅 DAY 3 — Restaurants, Menus & Redis Caching

### 📎 SETUP: Cloudinary (image storage)
> **Agent: give user this block.**
> 1. Go to **https://cloudinary.com** → sign up (free).
> 2. On the **Dashboard** you'll see **Cloud name**, **API Key**, **API Secret**.
> 3. Paste into `backend/.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- [x] User has pasted Cloudinary keys
- [x] `npm i cloudinary multer && npm i -D @types/multer`

### Restaurants module (`modules/restaurants/`)
- [x] `restaurant.types.ts`, `restaurant.service.ts` — CRUD (owner-scoped), list with filters
- [x] `restaurant.controller.ts`, `restaurant.routes.ts` (create/update guarded by `RESTAURANT_OWNER`)
- [x] Image upload to Cloudinary on create/update

### Menu module (`modules/menu/`)
- [x] `menu.service.ts` — CRUD menu items under a restaurant, stock field
- [x] `menu.controller.ts`, `menu.routes.ts`

### Redis caching (the point of today)
- [x] `restaurants/restaurant.cache.ts` — cache-aside: `getRestaurantList` checks Redis → miss → DB → set with TTL
- [x] `menu/menu.cache.ts` — cache a restaurant's menu
- [x] Invalidate cache on any create/update/delete (delete the Redis key)
- [x] Verify: first GET hits DB (log "cache miss"), second GET hits cache (log "cache hit"); after an update, cache is busted
- [x] `middlewares/rateLimit.middleware.ts` — Redis-based limiter; apply to public list endpoints

**End of Day 3:** restaurants + menus CRUD, images, cache-aside working & invalidating. ✅

---

## 📅 DAY 4 — Cart, Capacity Slots, Orders & the Concurrency Core

> **This is the most important day. The "two orders, one item" race is the centerpiece.**

### Cart module (`modules/cart/`)
- [x] `cart.service.ts` — add/remove/update items, get active cart, clear
- [x] `cart.controller.ts`, `cart.routes.ts` (customer-only)

### Capacity module (`modules/capacity/`) — kitchen time-window slots
- [x] `capacity.slots.ts` — compute current slot window (e.g. floor time to 15-min bucket), Redis key per `restaurant:slot`
- [x] `capacity.service.ts` — `reserveSlot(restaurantId)`: atomic `DECR` remaining slot capacity; reject if `< 0`
- [x] Seed each restaurant with `maxOrdersPerSlot`  <!-- already seeded in seed.ts (5/4/6) -->
- [x] Verify: slot counter decrements per order, blocks when full, resets next window

### Orders module (`modules/orders/`) — the race handling
- [x] `order.lock.ts` — Redis distributed lock (SET NX PX pattern) per menu-item / slot; safe release via Lua token check
- [x] `utils/idempotency.ts` — store/check idempotency key in Redis so a repeated request returns the same order
- [x] `order.service.ts` — `placeOrder`:
      1. accept `Idempotency-Key` header → if seen, return existing order
      2. acquire lock on each item + slot
      3. re-check stock & capacity **inside** the lock
      4. create order (PENDING) + decrement stock/slot atomically
      5. release lock
      6. **enqueue** order job (added Day 5; today process inline as placeholder)  <!-- placeholder TODO left in service -->
- [x] `order.controller.ts`, `order.routes.ts`
- [x] **PROVE THE RACE:** write `scripts/raceTest.ts` firing 20 concurrent `placeOrder` for an item with stock=1 → assert exactly 1 succeeds, 19 get "out of stock". Document result.  <!-- ✅ 1 winner / 19 × 409 confirmed -->

**End of Day 4:** orders place correctly under concurrent load, exactly-one-winner proven, capacity slots enforced. ✅

---

## 📅 DAY 5 — BullMQ Queues, Workers, Idempotency & Reliability

### Queue producers (`queues/`)
- [ ] `queues/connection.ts` — shared BullMQ Redis connection
- [ ] `queues/order.queue.ts` — `orderQueue` producer
- [ ] `queues/email.queue.ts`, `queues/notification.queue.ts`
- [ ] `queues/index.ts` — export all
- [ ] Update `order.service.ts` to **enqueue** the order job instead of inline processing

### Workers (`workers/`) — separate process
- [ ] `workers/order.worker.ts` — consume order jobs **in arrival order**; inside: finalize payment (call payment service), set status CONFIRMED→PREPARING, enqueue email + notification jobs; **idempotency check** (skip if order already processed); retries w/ exponential backoff; failed jobs → DLQ
- [ ] `modules/payments/payment.service.ts` — mock gateway, **idempotent** on order id
- [ ] `workers/email.worker.ts` — send emails (Nodemailer, see setup below)
- [ ] `workers/notification.worker.ts` — placeholder that will emit Socket.io events (Day 6)
- [ ] `workers/index.ts` — boot all workers; verify `npm run worker` runs as its own process

### 📎 SETUP: Email (Nodemailer)
> **Agent: give user this block.**
> Easiest for dev: use **Gmail App Password** (needs 2FA on your Google account) OR a free **Mailtrap** inbox (recommended — no real emails sent).
> **Mailtrap:** https://mailtrap.io → Email Testing → Inboxes → copy SMTP host/port/user/pass → paste into `SMTP_HOST/PORT/USER/PASS` in `backend/.env`.
- [ ] User has pasted SMTP creds
- [ ] Verify: placing an order → order worker runs → confirmation email appears in Mailtrap inbox

### Bull Board monitoring
- [ ] `src/bull-board.ts` — mount Bull Board at `/admin/queues`
- [ ] Verify: open `http://localhost:4000/admin/queues`, see jobs flowing, retry a failed job manually
- [ ] `jobs/cleanup.job.ts` — repeatable job to expire stale carts / abandoned slot holds

**End of Day 5:** BACKEND COMPLETE. Orders flow through queue → worker → payment → email, idempotent, retryable, observable. ✅

---

## 📅 DAY 6 — Real-time (Socket.io) + Frontend Integration

### Socket.io backend (`realtime/`)
- [ ] `npm i socket.io @socket.io/redis-adapter`
- [ ] `realtime/socket.ts` — init `io` on same HTTP server, attach Redis adapter (pub/sub)
- [ ] `realtime/socket.auth.ts` — verify JWT on handshake
- [ ] `realtime/socket.events.ts` — event constants (`ORDER_STATUS_UPDATED`, `DELIVERY_LOCATION`, etc.)
- [ ] `realtime/handlers/order.handler.ts` — join room `order:{id}`, emit status changes
- [ ] `realtime/handlers/delivery.handler.ts` — delivery partner location broadcast
- [ ] Update `notification.worker.ts` to emit real-time events on status change
- [ ] `modules/delivery/` — assign partner, update status/location
- [ ] Verify: change an order status in worker → connected client receives event

### Frontend scaffold
- [ ] `cd frontend && npx create-next-app@latest .` (TS, App Router, Tailwind, src dir)
- [ ] Install: `npm i axios socket.io-client @tanstack/react-query zustand next-auth`
- [ ] shadcn init + add base components
- [ ] `lib/api.ts` (axios + JWT interceptor), `lib/socket.ts`, `lib/auth.ts` (NextAuth Google + credentials)
- [ ] `providers/QueryProvider.tsx`, `providers/SocketProvider.tsx`, wire in `layout.tsx`
- [ ] `store/cartStore.ts` (Zustand); hooks `useSocket`, `useCart`, `useOrderTracking`

### Frontend pages
- [ ] Auth pages: `login`, `register` (Google + email)
- [ ] Home `page.tsx` — restaurant list (TanStack Query)
- [ ] `restaurants/[id]` — menu + add to cart
- [ ] `cart` + `checkout` — place order (sends `Idempotency-Key`)
- [ ] `orders` list + `orders/[id]` — **LIVE tracking** via Socket.io (`OrderStatusTimeline`)
- [ ] Restaurant dashboard — incoming orders live; Delivery dashboard
- [ ] Verify end-to-end: browse → cart → checkout → watch status update live without refresh

**End of Day 6:** full product working end-to-end with live tracking. ✅

---

## 📅 DAY 7 — RAG (LAST), Polish, Docs & Demo

> **Only now do we build `modules/search/` and add pgvector. RAG is a FEATURE inside the app.**

### 📎 SETUP: pgvector on Supabase + Gemini key
> **Agent: give user this block.**
> 1. **Enable pgvector:** Supabase → **Database → Extensions** → search `vector` → enable it. (Or run `CREATE EXTENSION IF NOT EXISTS vector;` in the SQL Editor.)
> 2. **Gemini key:** go to **https://aistudio.google.com/app/apikey** → Create API key → paste into `backend/.env` as `GEMINI_API_KEY`.
- [ ] User enabled pgvector + pasted `GEMINI_API_KEY`
- [ ] `npm i @langchain/google-genai langchain @langchain/community`

### Schema + ingestion
- [ ] Add `embedding vector(768)` column to `menu_items` (raw SQL — add to `db/schema.sql` after enabling pgvector)
- [ ] Create ivfflat index on the embedding column
- [ ] `modules/search/rag.embeddings.ts` — Gemini `text-embedding-004` wrapper
- [ ] `modules/search/rag.ingest.ts` — build a text blob per menu item (name + desc + veg + spice + price) → embed → store; script to backfill all seeded items

### Query pipeline
- [ ] `modules/search/rag.query.ts` — embed user query → pgvector cosine search (filter by veg/price if parsed) → pass top-K to Gemini → return dishes + natural-language answer + which items were used
- [ ] `search.service.ts`, `search.controller.ts`, `search.routes.ts` — `POST /search` (rate-limited, cached in Redis)
- [ ] Frontend `search/page.tsx` + `components/search/SearchBar.tsx` — the concierge UI
- [ ] Verify: "spicy veg under ₹200 ready in 30 min" returns sensible dishes with an explanation

### Polish & docs
- [ ] Expand `db/seed.ts` to a rich demo dataset (multiple cuisines) and re-ingest embeddings
- [ ] `Dockerfile`, `Dockerfile.worker`, `frontend/Dockerfile`; finalize `docker-compose.yml` (backend + worker + redis; Supabase is remote)
- [ ] `.github/workflows/ci.yml` — lint + typecheck + build
- [ ] README final pass: architecture diagram accurate, screenshots/GIF of live tracking + RAG search
- [ ] Record 2-minute demo video
- [ ] Deploy: frontend → Vercel, backend + worker → Railway/Render, Redis → Upstash, DB stays Supabase

**End of Day 7:** RAG concierge live, dockerized, deployed, documented. PROJECT COMPLETE. 🎉

---

## 🔒 Non-negotiables checklist (verify before calling it done)
- [ ] Concurrent-order race yields exactly one winner (raceTest passes)
- [ ] Order processing is idempotent (same Idempotency-Key ⇒ one order)
- [ ] BullMQ retries + DLQ work; Bull Board shows queues
- [ ] Cache-aside hits/misses + invalidation verified
- [ ] Live order tracking updates without refresh
- [ ] RAG search returns grounded results from real menu data
- [ ] No secrets committed; `.env.example` complete
- [ ] `tsc` clean across backend and frontend
