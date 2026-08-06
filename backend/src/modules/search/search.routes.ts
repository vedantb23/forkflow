import { Router } from "express";
import { searchMenuItems } from "./search.controller";
import { rateLimit } from "../../middlewares/rateLimit.middleware";

const router = Router();

router.post("/", rateLimit(10, 5), searchMenuItems);

export { router as searchRoutes };
