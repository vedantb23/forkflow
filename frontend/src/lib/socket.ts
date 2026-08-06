"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

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

export function closeSocket(): void {
  socket?.disconnect();
  socket = null;
}
