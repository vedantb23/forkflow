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

app.use(errorMiddleware);

export { app };
