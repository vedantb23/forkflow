// ─────────────────────────────────────────────────────────────
// socket.auth.ts — the gatekeeper for WebSocket connections.
// Mirror of auth.middleware.ts, but for Socket.io instead of HTTP.
//
// CONCEPT — the "handshake": before a socket connection becomes live, Socket.io
// runs a one-time setup called the handshake. We register a middleware that runs
// DURING it: read the client's JWT, verify it, and either let the socket in
// (attaching the decoded user) or reject it. Same JWT + same verifyToken() as the
// REST API — one identity system, two transports (HTTP and WebSocket).
// ─────────────────────────────────────────────────────────────

// Step 1 — imports.
import type { Socket } from "socket.io"; // the per-connection socket object
import { verifyToken } from "../modules/auth/auth.service"; // reuse HTTP token check
import type { JwtPayload } from "../modules/auth/auth.types"; // { sub, role }
import { logger } from "../config/logger";

// Step 2 — teach TypeScript that WE attach `.user` onto a socket after auth.
// socket.data is Socket.io's official per-connection bag for custom fields.
// This module augmentation makes `socket.data.user` typed everywhere.
declare module "socket.io" {
  interface SocketData {
    user: JwtPayload; // set below once the handshake token is verified
  }
}

// Step 3 — pull the token out of the handshake.
// The client can send it two ways; we accept both:
//   3a) socket.handshake.auth.token — the recommended way (io(url, { auth: { token } })).
//   3b) Authorization: Bearer <token> header — fallback for non-browser clients.
function extractHandshakeToken(socket: Socket): string | null {
  // 3a) preferred: the auth object sent by socket.io-client.
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }
  // 3b) fallback: standard Authorization header.
  const header = socket.handshake.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  // 3c) nothing found.
  return null;
}

// Step 4 — the middleware itself. Socket.io calls it with (socket, next).
// Call next() with NO argument to accept the connection; call next(err) to
// reject it (the client gets a "connect_error" event and never connects).
export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const token = extractHandshakeToken(socket);
  if (!token) {
    // No credentials → refuse the connection.
    return next(new Error("Authentication required: no token"));
  }
  try {
    // verifyToken throws if the token is missing/expired/forged.
    const payload = verifyToken(token);
    // Attach the identity so handlers below can read who this socket belongs to.
    socket.data.user = payload;
    logger.debug({ userId: payload.sub, role: payload.role }, "socket authenticated");
    return next(); // no arg = allow the connection through.
  } catch {
    // Any verify failure → reject. We don't leak the reason to the client.
    return next(new Error("Authentication failed: invalid token"));
  }
}
