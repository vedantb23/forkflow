import { Router } from "express";
import { searchMenuItems } from "./search.controller";
import { rateLimit } from "../../middlewares/rateLimit.middleware";

const router = Router();

// Rate limit the AI search heavily to prevent API abuse
// max 5 searches per 10 minutes per IP
router.post("/", rateLimit(10, 5), searchMenuItems);

export { router as searchRoutes };
