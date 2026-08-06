"use client";

import Link from "next/link";
import { useCart } from "@/store/cartStore";
import { TopNavBar } from "@/components/TopNavBar";
import { Footer } from "@/components/Footer";

export default function CartPage() {
  const { lines, setQty, remove, total, clear } = useCart();

  if (lines.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopNavBar />
        <main className="flex-grow pt-[100px] pb-[64px] flex items-center justify-center px-[20px]">
          <div className="glass-card  w-full p-[40px] rounded-2xl text-center shadow-sm border border-outline-variant/30 animate-fade-up">
            <span className="material-symbols-outlined text-[64px] text-surface-container-high mb-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              shopping_cart
            </span>
            <h1 className="font-headline-lg text-[28px] text-on-surface mb-[16px]">Your Cart is Empty</h1>
            <p className="font-body-md text-[16px] text-on-surface-variant mb-[32px]">
              Looks like you haven't added any premium dishes to your cart yet.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-12 px-[32px] bg-primary text-on-primary rounded-xl font-label-md text-[16px] font-bold shadow-md hover:shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Discover Restaurants
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />

      <main className="flex-grow pt-[100px] pb-[64px] px-[20px] md:px-[48px] mx-auto w-full animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-[32px] gap-[16px]">
          <div>
            <h1 className="font-display-lg text-[36px] text-on-surface">Your Cart</h1>
            <p className="font-body-md text-[16px] text-on-surface-variant">Review your premium selection before checkout.</p>
          </div>
          <button
            onClick={clear}
            className="flex items-center gap-[8px] text-error hover:bg-error-container/50 px-[16px] py-[8px] rounded-lg transition-colors font-label-md text-[14px]"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[32px]">
          {/* Cart Items */}
          <div className="lg:col-span-8 space-y-[16px]">
            {lines.map((l, index) => (
              <div
                key={l.item.id}
                className="glass-card rounded-xl p-[20px] border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[16px] animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-grow">
                  <h3 className="font-headline-md text-[18px] text-on-surface">{l.item.name}</h3>
                  <p className="font-label-sm text-[14px] text-primary font-bold mt-[4px]">₹{Number(l.item.price).toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-[16px] w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/30">
                    <button
                      onClick={() => setQty(l.item.id, Math.max(1, l.quantity - 1))}
                      className="w-[36px] h-[36px] flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <div className="w-[40px] text-center font-label-md text-[14px] text-on-surface">
                      {l.quantity}
                    </div>
                    <button
                      onClick={() => setQty(l.item.id, l.quantity + 1)}
                      className="w-[36px] h-[36px] flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>

                  <div className="font-headline-md text-[18px] text-on-surface min-w-[80px] text-right">
                    ₹{(Number(l.item.price) * l.quantity).toFixed(2)}
                  </div>

                  <button
                    onClick={() => remove(l.item.id)}
                    className="w-[36px] h-[36px] flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors ml-[8px]"
                    aria-label="Remove item"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-4">
            <div className="glass-card rounded-xl p-[24px] border border-outline-variant/30 sticky top-[100px] animate-fade-up delay-200">
              <h2 className="font-headline-md text-[20px] text-on-surface mb-[24px] pb-[16px] border-b border-outline-variant/30">Order Summary</h2>

              <div className="space-y-[16px] mb-[24px]">
                <div className="flex justify-between font-body-md text-[16px] text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>₹{total().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-body-md text-[16px] text-on-surface-variant">
                  <span>Delivery Fee</span>
                  <span className="text-tertiary-container font-bold">Free</span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-outline-variant/30 pt-[16px] mb-[32px]">
                <span className="font-headline-md text-[18px] text-on-surface">Total</span>
                <span className="font-display-lg text-[32px] text-primary">₹{total().toFixed(2)}</span>
              </div>

              <Link
                href="/checkout"
                className="w-full h-14 bg-gradient-to-r from-primary to-surface-tint text-on-primary rounded-xl font-label-md text-[16px] font-bold shadow-md hover:shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-[8px]"
              >
                Proceed to Checkout
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
