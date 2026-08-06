import type { Socket } from "socket.io";
import { verifyToken } from "../modules/auth/auth.service";
import type { JwtPayload } from "../modules/auth/auth.types";
import { logger } from "../config/logger";

declare module "socket.io" {
  interface SocketData {
    user: JwtPayload;
  }
}

function extractHandshakeToken(socket: Socket): string | null {

  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }

  const header = socket.handshake.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  return null;
}

export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const token = extractHandshakeToken(socket);
  if (!token) {

    return next(new Error("Authentication required: no token"));
  }
  try {

    const payload = verifyToken(token);

    socket.data.user = payload;
    logger.debug({ userId: payload.sub, role: payload.role }, "socket authenticated");
    return next();
  } catch {

    return next(new Error("Authentication failed: invalid token"));
  }
}
