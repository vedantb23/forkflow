"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { OrderStatus } from "@/lib/types";

export interface LiveLocation {
  lat: number;
  lng: number;
  at: number;
}

export function useOrderTracking(orderId: string, initialStatus: OrderStatus) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [location, setLocation] = useState<LiveLocation | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (!orderId) return;
    const socket = getSocket();

    socket.emit("order:join", { orderId });

    const onStatus = (p: { orderId: string; status: OrderStatus }) => {
      if (p.orderId === orderId) setStatus(p.status);
    };
    const onLocation = (p: { orderId: string; lat: number; lng: number; at: number }) => {
      if (p.orderId === orderId) setLocation({ lat: p.lat, lng: p.lng, at: p.at });
    };

    socket.on("order:status_updated", onStatus);
    socket.on("delivery:location_updated", onLocation);

    return () => {
      socket.off("order:status_updated", onStatus);
      socket.off("delivery:location_updated", onLocation);
    };
  }, [orderId]);

  return { status, location };
}
