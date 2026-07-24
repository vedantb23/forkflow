"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useCart } from "@/store/cartStore";
import { useAuth } from "@/store/authStore";
import type { OrderView } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { restaurantId, lines, total, clear } = useCart();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  // Place the order. Generates a fresh Idempotency-Key so a retry (double-click,
  // network blip) can never create two orders. On success clears the cart and
  // jumps to the live tracking page.
  async function placeOrder() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!restaurantId || lines.length === 0) return;

    setPlacing(true);
    setError("");
    try {
      const key = crypto.randomUUID();
      const body = {
        restaurant_id: restaurantId,
        items: lines.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity })),
      };
      const { order } = await apiPost<OrderView>("/orders", body, { "Idempotency-Key": key });
      clear();
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Could not place order");
    } finally {
      setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return <p className="mx-auto max-w-2xl p-8 text-center text-zinc-500">Nothing to check out.</p>;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>

      <div className="space-y-2 rounded-lg border bg-white p-4">
        {lines.map((l) => (
          <div key={l.item.id} className="flex justify-between text-sm">
            <span>
              {l.item.name} × {l.quantity}
            </span>
            <span>₹{(Number(l.item.price) * l.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>₹{total().toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={placeOrder}
        disabled={placing}
        className="mt-6 w-full rounded-lg bg-neutral-900 py-3 text-white disabled:opacity-50"
      >
        {placing ? "Placing order…" : "Place order"}
      </button>
    </main>
  );
}
