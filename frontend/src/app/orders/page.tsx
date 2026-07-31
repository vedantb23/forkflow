"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/store/authStore";
import { TopNavBar } from "@/components/TopNavBar";
import { Footer } from "@/components/Footer";
import type { Order } from "@/lib/types";

// Status → chip colours, using the design-system tokens so it matches the rest of
// the premium UI (and flips correctly in dark mode).
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-surface-container-high text-on-surface-variant",
  CONFIRMED: "bg-secondary-container text-on-secondary-container",
  PREPARING: "bg-tertiary-container/40 text-on-tertiary-container",
  OUT_FOR_DELIVERY: "bg-primary/10 text-primary",
  DELIVERED: "bg-tertiary-container text-on-tertiary-container",
  CANCELLED: "bg-error-container text-on-error-container",
};

export default function OrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch the logged-in customer's orders. GET /orders → { orders } (bare rows).
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGet<{ orders: Order[] }>("/orders").then((d) => d.orders),
    enabled: !!user,
    refetchInterval: 15_000, // fallback polling every 15s
  });

  // Socket-driven live updates: when any order's status changes, refetch the list.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onStatus = () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    };
    socket.on("order:status_updated", onStatus);
    return () => { socket.off("order:status_updated", onStatus); };
  }, [user, queryClient]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />

      <main className="flex-grow pt-[100px] pb-[64px] px-[20px] md:px-[48px] max-w-[900px] mx-auto w-full">
        <div className="mb-[32px] animate-fade-up">
          <h1 className="font-display-lg text-[36px] text-on-surface">Your Orders</h1>
          <p className="font-body-md text-[16px] text-on-surface-variant">
            Track past and active orders from your ForkFlow kitchens.
          </p>
        </div>

        {!user ? (
          <div className="glass-card rounded-2xl p-[40px] text-center border border-outline-variant/30 animate-fade-up">
            <span className="material-symbols-outlined text-[48px] text-surface-container-high mb-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
            <p className="font-body-lg text-[18px] text-on-surface-variant mb-[24px]">
              Please sign in to see your orders.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 px-[32px] bg-primary text-on-primary rounded-xl font-label-md text-[16px] font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Sign In
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-[64px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="glass-card rounded-2xl p-[40px] text-center border border-outline-variant/30 animate-fade-up">
            <span className="material-symbols-outlined text-[48px] text-surface-container-high mb-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              receipt_long
            </span>
            <p className="font-body-lg text-[18px] text-on-surface-variant mb-[24px]">No orders yet.</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-12 px-[32px] bg-primary text-on-primary rounded-xl font-label-md text-[16px] font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Discover Restaurants
            </Link>
          </div>
        ) : (
          <div className="space-y-[16px]">
            {orders.map((o, index) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="glass-card rounded-xl p-[20px] border border-outline-variant/30 flex items-center justify-between gap-[16px] hover:-translate-y-0.5 transition-transform duration-200 animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div>
                  <p className="font-label-sm text-[12px] text-on-surface-variant font-mono">
                    #{o.id.slice(0, 8)}
                  </p>
                  <p className="font-body-md text-[16px] text-on-surface mt-[4px]">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-[8px]">
                  <span
                    className={`rounded-full px-[12px] py-[4px] font-label-sm text-[12px] font-bold ${STATUS_STYLES[o.status] ?? "bg-surface-container-high text-on-surface-variant"}`}
                  >
                    {o.status.replace(/_/g, " ")}
                  </span>
                  <span className="font-headline-md text-[20px] text-primary">
                    ₹{Number(o.total_amount).toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
