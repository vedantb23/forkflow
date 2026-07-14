// ─────────────────────────────────────────────────────────────
// app.ts — builds the Express application (the request pipeline).
// A request flows top-to-bottom through this file:
//   security headers → CORS → body parsing → cookies → routes → error handler
// We EXPORT the app but do NOT start listening here — server.ts does that.
// WHY split app vs server? So tests can import the app without opening a port.
// ─────────────────────────────────────────────────────────────

// Step 1 — imports.
import express from "express"; // the web framework
import helmet from "helmet"; // sets safe HTTP headers
import cors from "cors"; // controls which origins may call us
import cookieParser from "cookie-parser"; // parses the Cookie header into req.cookies
import { env } from "./config/env"; // validated env (for CLIENT_URL)
import { errorMiddleware } from "./middlewares/error.middleware"; // central error handler
import { authRoutes } from "./modules/auth/auth.routes"; // /api/auth/*
import { userRoutes } from "./modules/users/user.routes"; // /api/users/*

// Step 2 — create the app instance.
const app = express();

// Step 3 — global middleware, in the order every request passes through them.

// 3a) helmet: automatically sets headers like X-Content-Type-Options, etc.,
// closing off a bunch of common web vulnerabilities with zero config.
app.use(helmet());

// 3b) cors: the browser blocks cross-origin requests by default. Our frontend
// runs on CLIENT_URL (http://localhost:3000) and must be allowed to call this
// API. `credentials: true` lets cookies (our auth token) travel with requests.
app.use(
  cors({
    origin: env.CLIENT_URL, // only allow our frontend origin
    credentials: true, // allow cookies/authorization headers
  })
);

// 3c) express.json(): parse incoming JSON request bodies into req.body.
app.use(express.json());

// 3d) cookieParser(): read cookies from the request into req.cookies.
app.use(cookieParser());

// Step 4 — routes.
// Today we only have a health check. Real feature routes get mounted here later
// (e.g. app.use("/api/auth", authRoutes) on Day 2).
//
// GET /health — a tiny endpoint to confirm the server is alive. Load balancers
// and uptime monitors ping this. If it returns { status: "ok" }, we're up.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" }); // simple, no DB — just "am I running?"
});

// Step 4b — feature routes (Day 2). Each module owns a router; we mount each
// under an "/api/..." prefix so all API endpoints share a clear namespace.
app.use("/api/auth", authRoutes); // register, login, me, logout
app.use("/api/users", userRoutes); // profile get/update, admin list

// Step 5 — error handler LAST.
// Any error forwarded via next(err) from anywhere above ends up here.
// It MUST be registered after all routes, or it won't catch their errors.
app.use(errorMiddleware);

// Step 6 — export the configured app for server.ts (and future tests).
export { app };
