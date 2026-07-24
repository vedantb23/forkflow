"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useOrderTracking } from "@/hooks/useOrderTracking";
import type { OrderView } from "@/lib/types";

// The status pipeline in the order it actually progresses through, so we can draw
// a simple stepper and mark everything up to the current status as done.
const STEPS = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  // Load the order once for its initial status + item list. Live updates after
  // this come over the socket, not by refetching.
  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiGet<OrderView>(`/orders/${orderId}`),
    enabled: !!orderId,
  });

  // Subscribe to live status + delivery-location events for this order. `status`
  // starts from the fetched value and then tracks whatever the server pushes.
  const { status, location } = useOrderTracking(orderId, data?.order.status ?? "PENDING");

  if (isLoading || !data) return <p className="p-8 text-zinc-500">Loading order…</p>;

  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">Order #{orderId.slice(0, 8)}</h1>
      <p className="mb-6 text-sm text-zinc-500">Live tracking — updates in real time.</p>

      {/* Status stepper */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  done ? "bg-green-600 text-white" : "bg-zinc-200 text-zinc-500"
                } ${active ? "ring-2 ring-green-300" : ""}`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={done ? "font-medium" : "text-zinc-400"}>
                {step.replace(/_/g, " ")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live delivery location, shown once the partner starts sending coords */}
      {location && (
        <div className="mt-6 rounded-lg border bg-white p-4">
          <p className="text-sm font-medium">Delivery partner location</p>
          <p className="text-sm text-zinc-600">
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </p>
          <p className="text-xs text-zinc-400">
            updated {new Date(location.at).toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Items */}
      <div className="mt-6 rounded-lg border bg-white p-4">
        <p className="mb-2 text-sm font-medium">Items</p>
        {data.items.map((it) => (
          <div key={it.id} className="flex justify-between text-sm">
            <span>
              {it.name_snapshot} × {it.quantity}
            </span>
            <span>₹{(Number(it.price_snapshot) * it.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>₹{data.order.total_amount}</span>
        </div>
      </div>
    </main>
  );
}
