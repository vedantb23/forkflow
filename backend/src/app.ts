// app.ts — updated to mount order routes (Day 4).
// Only the import and mount line change; everything else stays identical.

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import { authRoutes } from "./modules/auth/auth.routes";
import { userRoutes } from "./modules/users/user.routes";
import { restaurantRoutes } from "./modules/restaurants/restaurant.routes";
import { menuRoutes } from "./modules/menu/menu.routes";
import { cartRoutes } from "./modules/cart/cart.routes";
import { orderRoutes } from "./modules/orders/order.routes"; // Day 4
import { deliveryRoutes } from "./modules/delivery/delivery.routes"; // Day 6
import { searchRoutes } from "./modules/search/search.routes"; // Day 7 - RAG
import { bullBoardRouter } from "./bull-board"; // Day 5 — queue dashboard
import { rateLimit } from "./middlewares/rateLimit.middleware";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/restaurants", rateLimit(60, 30), restaurantRoutes);
app.use("/api/menu", rateLimit(60, 30), menuRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes); // Day 4 — place + track orders
app.use("/api/delivery", deliveryRoutes); // Day 6 — assign partner, status, location
app.use("/api/search", searchRoutes); // Day 7 - RAG Concierge Search

// Step 4e — Bull Board dashboard (Day 5) at /admin/queues. Lets us watch jobs
// flow (waiting/active/completed/failed) and retry failed jobs by hand. Mounted
// WITHOUT rateLimit — it's an internal admin tool, not a public endpoint.
// (In production this would sit behind admin auth; fine open on localhost for dev.)
app.use("/admin/queues", bullBoardRouter);

app.use(errorMiddleware);

export { app };
