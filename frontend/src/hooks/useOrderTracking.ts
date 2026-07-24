"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { OrderStatus } from "@/lib/types";

export interface LiveLocation {
  lat: number;
  lng: number;
  at: number;
}

// Subscribe to live updates for ONE order. On mount it joins the order's room and
// listens for status + delivery-location events; on unmount it detaches the
// listeners. This is the hook that makes the tracking page update without refresh.
export function useOrderTracking(orderId: string, initialStatus: OrderStatus) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [location, setLocation] = useState<LiveLocation | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const socket = getSocket();

    // Ask the server to put this socket in room `order:{orderId}` (matches the
    // backend CLIENT_EVENTS.JOIN_ORDER handler, which authorizes the join).
    socket.emit("order:join", { orderId });

    // Server pushes these when the worker/delivery service emits (matches
    // SERVER_EVENTS names in the backend's socket.events.ts).
    const onStatus = (p: { orderId: string; status: OrderStatus }) => {
      if (p.orderId === orderId) setStatus(p.status);
    };
    const onLocation = (p: { orderId: string; lat: number; lng: number; at: number }) => {
      if (p.orderId === orderId) setLocation({ lat: p.lat, lng: p.lng, at: p.at });
    };

    socket.on("order:status_updated", onStatus);
    socket.on("delivery:location_updated", onLocation);

    // Clean up so we don't stack duplicate listeners across navigations.
    return () => {
      socket.off("order:status_updated", onStatus);
      socket.off("delivery:location_updated", onLocation);
    };
  }, [orderId]);

  return { status, location };
}
