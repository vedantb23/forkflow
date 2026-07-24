"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// Return a lazily-created, shared Socket.io connection. The JWT is sent in the
// handshake auth (matches the backend's socket.auth.ts, which reads
// handshake.auth.token). Autoconnect is on; the same socket is reused app-wide.
export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL as string, {
      auth: { token },
      transports: ["websocket"],
    });
  }
  return socket;
}

// Drop the connection (used on logout so the next login re-handshakes with a
// fresh token).
export function closeSocket(): void {
  socket?.disconnect();
  socket = null;
}
