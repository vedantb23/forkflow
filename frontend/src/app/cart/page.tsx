"use client";

import Link from "next/link";
import { useCart } from "@/store/cartStore";

export default function CartPage() {
  const { lines, setQty, remove, total, clear } = useCart();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-zinc-500">
        <p>Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block underline">
          Browse restaurants
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cart</h1>
        <button onClick={clear} className="text-sm text-red-500 underline">
          Clear
        </button>
      </div>

      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.item.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
            <div>
              <p className="font-medium">{l.item.name}</p>
              <p className="text-sm text-zinc-500">₹{l.item.price}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={l.quantity}
                onChange={(e) => setQty(l.item.id, Number(e.target.value))}
                className="w-16 rounded border px-2 py-1"
              />
              <button onClick={() => remove(l.item.id)} className="text-sm text-red-500">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <span className="text-lg font-semibold">Total: ₹{total().toFixed(2)}</span>
        <Link
          href="/checkout"
          className="rounded-lg bg-neutral-900 px-5 py-2 text-white"
        >
          Checkout
        </Link>
      </div>
    </main>
  );
}
