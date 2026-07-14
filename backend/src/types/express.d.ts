// ─────────────────────────────────────────────────────────────
// express.d.ts — teach TypeScript about a field WE add to Express's Request.
// After our auth.middleware verifies the JWT, it attaches the decoded payload as
// `req.user`. But Express's built-in Request type doesn't know that field exists,
// so TS would error on `req.user`. This file "augments" the Express types to add it.
// This is a declaration file (.d.ts): types only, no runtime code.
// ─────────────────────────────────────────────────────────────

import type { JwtPayload } from "../modules/auth/auth.types";

// "declare global" reaches into global/ambient types. We re-open Express's
// namespace and add an optional `user` to its Request interface. Optional (?)
// because on public routes (no auth middleware) req.user is absent.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // set by auth.middleware after verifying the token
    }
  }
}

// An empty export makes this file a module, which is required for the
// `declare global` augmentation above to be applied correctly.
export {};
