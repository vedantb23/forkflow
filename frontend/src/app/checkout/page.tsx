"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useCart } from "@/store/cartStore";
import { useAuth } from "@/store/authStore";
import { TopNavBar } from "@/components/TopNavBar";
import { Footer } from "@/components/Footer";
import type { OrderView } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { restaurantId, lines, total, clear } = useCart();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

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

      const result = await apiPost<OrderView>("/orders", body, { "Idempotency-Key": key });
      clear();
      router.push(`/orders/${result.order.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Could not place order");
    } finally {
      setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopNavBar />
        <main className="flex-grow pt-[100px] flex items-center justify-center">
          <p className="font-body-lg text-[18px] text-on-surface-variant">Nothing to check out.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />

      <main className="flex-grow pt-[100px] pb-[64px] px-[20px] md:px-[48px] max-w-[800px] mx-auto w-full animate-fade-in">
        <h1 className="font-display-lg text-[36px] text-on-surface mb-[32px]">Checkout</h1>

        <div className="glass-card rounded-2xl p-[32px] border border-outline-variant/30 shadow-sm animate-fade-up">
          <h2 className="font-headline-md text-[24px] text-on-surface mb-[24px] pb-[16px] border-b border-outline-variant/30">Order Summary</h2>

          <div className="space-y-[16px] mb-[32px]">
            {lines.map((l) => (
              <div key={l.item.id} className="flex justify-between font-body-md text-[16px] text-on-surface items-center">
                <div className="flex gap-[12px] items-center">
                  <span className="w-[32px] h-[32px] bg-surface-container-high rounded flex items-center justify-center font-bold text-primary text-[14px]">
                    {l.quantity}x
                  </span>
                  <span>{l.item.name}</span>
                </div>
                <span className="font-bold">₹{(Number(l.item.price) * l.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-[24px] border-t border-outline-variant/30 pt-[24px] space-y-[12px]">
            <div className="flex justify-between font-body-md text-[16px] text-on-surface-variant">
              <span>Subtotal</span>
              <span>₹{total().toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-body-md text-[16px] text-on-surface-variant">
              <span>Taxes & Fees</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between items-center pt-[16px]">
              <span className="font-headline-md text-[20px] text-on-surface">Total</span>
              <span className="font-display-lg text-[36px] text-primary">₹{total().toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="mt-[24px] bg-error-container text-on-error-container p-[16px] rounded-lg font-label-md text-[14px] flex gap-[8px] items-center">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          <div className="mt-[40px]">
            <button
              onClick={placeOrder}
              disabled={placing}
              className="w-full h-14 bg-gradient-to-r from-primary to-surface-tint text-on-primary rounded-xl font-label-md text-[16px] font-bold shadow-md hover:shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-[12px] disabled:opacity-70"
            >
              {placing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                  <span>Place Order • ₹{total().toFixed(2)}</span>
                </>
              )}
            </button>
            <p className="text-center font-label-sm text-[12px] text-on-surface-variant mt-[16px]">
              By placing your order, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
