"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import type { Order } from "@/lib/types";

// Small colour map so each status reads at a glance.
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const { user } = useAuth();

  // Fetch the logged-in customer's orders (backend scopes by the JWT's user).
  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGet<{ orders: Order[] }>("/orders"),
    enabled: !!user,
  });

  if (!user) return <p className="p-8 text-zinc-500">Please log in to see your orders.</p>;
  if (isLoading) return <p className="p-8 text-zinc-500">Loading orders…</p>;

  const orders = data?.orders ?? [];

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Your orders</h1>

      {orders.length === 0 ? (
        <p className="text-zinc-500">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-lg border bg-white p-4 hover:border-zinc-400"
            >
              <div>
                <p className="font-mono text-sm text-zinc-500">#{o.id.slice(0, 8)}</p>
                <p className="text-sm">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[o.status] ?? ""}`}
                >
                  {o.status}
                </span>
                <p className="mt-1 font-semibold">₹{o.total_amount}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
