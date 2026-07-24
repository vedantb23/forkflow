"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/store/authStore";
import type { Restaurant } from "@/lib/types";

// An order as it arrives over the `order:new` socket event.
interface IncomingOrder {
  orderId: string;
  status: string;
  total_amount: string;
  created_at: string;
}

export default function RestaurantDashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<IncomingOrder[]>([]);

  // Load the owner's restaurants so we know which rooms to join.
  const { data } = useQuery({
    queryKey: ["my-restaurants"],
    queryFn: () => apiGet<{ restaurants: Restaurant[] }>("/restaurants/mine"),
    enabled: !!user,
  });

  const restaurants = data?.restaurants;

  // Join each restaurant room and prepend any order that comes in live.
  useEffect(() => {
    if (!restaurants || restaurants.length === 0) return;
    const socket = getSocket();

    restaurants.forEach((r) => socket.emit("restaurant:join", { restaurantId: r.id }));

    const onNew = (order: IncomingOrder) => setOrders((prev) => [order, ...prev]);
    socket.on("order:new", onNew);

    return () => {
      socket.off("order:new", onNew);
    };
  }, [restaurants]);

  if (!user) return <p className="p-8 text-zinc-500">Log in as an owner to view the dashboard.</p>;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">Incoming orders</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Live feed — new orders appear here the moment a customer checks out.
      </p>

      {orders.length === 0 ? (
        <p className="text-zinc-400">Waiting for orders…</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.orderId} className="flex items-center justify-between rounded-lg border bg-white p-4">
              <div>
                <p className="font-mono text-sm text-zinc-500">#{o.orderId.slice(0, 8)}</p>
                <p className="text-sm">{new Date(o.created_at).toLocaleTimeString()}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                  {o.status}
                </span>
                <p className="mt-1 font-semibold">₹{o.total_amount}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
