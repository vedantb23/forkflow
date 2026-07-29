"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopNavBar } from "@/components/TopNavBar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { OrderView, OrderStatus, Restaurant } from "@/lib/types";

export default function RestaurantDashboard() {
  const [isLive, setIsLive] = useState(true);
  // Order ids currently being accepted, so we can disable the button + show a
  // spinner while the PATCH is in flight (prevents double-clicks / double-accept).
  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Which restaurant's kitchen is this? Owners can have several; we drive the KDS
  // off their first one for the demo. GET /restaurants/mine → { restaurants }.
  const { data: myRestaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ["my-restaurant"],
    queryFn: () =>
      apiGet<{ restaurants: Restaurant[] }>("/restaurants/mine").then((d) => d.restaurants[0] ?? null),
  });
  const restaurantId = myRestaurant?.id;

  const { data: orders, isLoading } = useQuery({
    queryKey: ["restaurant-orders", restaurantId],
    // Owner feed: every order for this restaurant, each as { order, items }.
    queryFn: () =>
      apiGet<{ orders: OrderView[] }>(`/orders/restaurant/${restaurantId}`).then((d) => d.orders),
    enabled: !!restaurantId, // wait until we know the restaurant id
  });

  useEffect(() => {
    if (!restaurantId) return;
    const socket = getSocket();

    // Join this restaurant's room so the backend pushes new orders here live.
    socket.emit("restaurant:join", { restaurantId });

    // A brand-new order landed (backend emits ORDER_NEW = "order:new"). The payload
    // is an order summary, not a full view, so the simplest correct move is to
    // refetch the feed — cheap, and guarantees we render the new order with items.
    const onNew = () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders", restaurantId] });
    };
    socket.on("order:new", onNew);

    // A status changed elsewhere (e.g. delivery picked it up) — patch our cache.
    const onStatus = (payload: { orderId: string; status: OrderStatus }) => {
      queryClient.setQueryData<OrderView[]>(["restaurant-orders", restaurantId], (old) => {
        if (!old) return old;
        return old.map((o) =>
          o.order.id === payload.orderId
            ? { ...o, order: { ...o.order, status: payload.status } }
            : o
        );
      });
    };
    socket.on("order:status_updated", onStatus);

    return () => {
      socket.off("order:new", onNew);
      socket.off("order:status_updated", onStatus);
    };
  }, [queryClient, restaurantId]);

  const links = [
    { icon: "skillet", label: "Live Orders", href: "/dashboard/restaurant" },
    { icon: "menu_book", label: "Menu Manager", href: "/dashboard/restaurant/menu" },
  ];

  // Owner accepts a CONFIRMED order → PREPARING. This is the manual gate: nothing
  // moves out of Incoming without the kitchen actively accepting it. PREPARING is
  // also the state couriers can claim (see claimDelivery), so this single action
  // both starts the cook and makes the order available for pickup.
  // Backend: PATCH /orders/:id/status { status } — owner-only, emits the live
  // ORDER_STATUS_UPDATED event which our onStatus listener folds into the cache.
  const acceptOrder = async (orderId: string) => {
    setAcceptingIds((prev) => new Set(prev).add(orderId));
    try {
      await apiPatch(`/orders/${orderId}/status`, { status: "PREPARING" });
      // Optimistically reflect it locally too; the socket event will also arrive.
      queryClient.setQueryData<OrderView[]>(["restaurant-orders", restaurantId], (old) =>
        old?.map((o) =>
          o.order.id === orderId ? { ...o, order: { ...o.order, status: "PREPARING" } } : o
        )
      );
    } catch (err) {
      console.error("Failed to accept order", err);
    } finally {
      setAcceptingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavBar />
        <div className="flex h-screen pt-16">
          <DashboardSidebar title="Restaurant" subtitle="Loading..." links={links} userType="restaurant" />
          <main className="flex-1 md:ml-64 p-[24px] md:p-[48px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </main>
        </div>
      </div>
    );
  }

  if (!myRestaurant) {
    return (
      <div className="min-h-screen bg-background">
        <div className="md:hidden"><TopNavBar /></div>
        <div className="flex h-screen pt-16 md:pt-0">
          <DashboardSidebar title="Restaurant" subtitle="No restaurant yet" links={links} userType="restaurant" />
          <main className="flex-1 md:ml-64 flex items-center justify-center p-[24px]">
            <div className="glass-card rounded-2xl p-[48px] text-center border border-outline-variant/30 max-w-md w-full">
              <span className="material-symbols-outlined text-[64px] text-primary mb-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
              <h2 className="font-headline-md text-[24px] text-on-surface mb-[8px]">No restaurant yet</h2>
              <p className="font-body-md text-[16px] text-on-surface-variant mb-[32px]">Create your restaurant to start receiving orders.</p>
              <Link href="/dashboard/restaurant/create" className="inline-flex items-center justify-center h-12 px-[32px] bg-primary text-on-primary rounded-xl font-label-md text-[16px] font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all gap-[8px]">
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create Restaurant
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const incomingOrders = orders?.filter((o) => o.order.status === "PENDING" || o.order.status === "CONFIRMED") || [];
  const prepOrders = orders?.filter((o) => o.order.status === "PREPARING") || [];
  const readyOrders = orders?.filter((o) => o.order.status === "OUT_FOR_DELIVERY" || o.order.status === "DELIVERED" || o.order.status === "CANCELLED") || [];

  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* Mobile Top Nav */}
      <div className="md:hidden">
        <TopNavBar />
      </div>

      <div className="flex h-screen pt-16 md:pt-0">
        <DashboardSidebar
          title="Kitchen Display System"
          subtitle="Live Orders"
          links={links}
          userType="restaurant"
        />

        <main className="flex-1 md:ml-64 p-[24px] md:p-[48px] overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[40px] gap-[16px]">
            <div>
              <h1 className="font-headline-lg text-[32px] text-on-surface">Kitchen Display System</h1>
              <p className="font-body-md text-[16px] text-on-surface-variant">Manage live orders in real-time.</p>
            </div>
            
            {/* Go Live Toggle */}
            <div className="glass-panel px-[24px] py-[12px] rounded-full flex items-center gap-[16px] shadow-sm">
              <span className={`font-label-md text-[14px] ${isLive ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                {isLive ? 'Accepting Orders' : 'Paused'}
              </span>
              <button 
                onClick={() => setIsLive(!isLive)}
                className={`relative w-[52px] h-[28px] rounded-full transition-colors duration-300 ${isLive ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant'}`}
              >
                <div className={`absolute top-[4px] left-[4px] w-[20px] h-[20px] rounded-full bg-white transition-transform duration-300 shadow-sm ${isLive ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>

          {!isLive && (
            <div className="w-full bg-surface-variant text-on-surface-variant p-4 rounded-lg mb-8 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">pause_circle</span>
              <span className="font-label-md">Store is currently paused. You will not receive new orders.</span>
            </div>
          )}

          {/* Kanban Board */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-[24px] h-[calc(100vh-200px)] min-h-[600px]">
            {/* Column 1: Incoming */}
            <div className="flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-surface p-[16px] border-b border-outline-variant/30 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-[8px]">
                  <span className="w-3 h-3 rounded-full bg-error animate-pulse"></span>
                  <h2 className="font-label-lg text-[16px] font-bold text-on-surface">Incoming</h2>
                </div>
                <span className="bg-error-container text-on-error-container px-2 py-1 rounded-full font-label-sm text-[12px]">
                  {incomingOrders.length}
                </span>
              </div>
              <div className="p-[16px] overflow-y-auto flex-1 space-y-[16px] custom-scrollbar">
                {incomingOrders.map((o) => (
                  <div key={o.order.id} className="bg-surface border border-outline-variant/50 rounded-lg p-[16px] shadow-sm hover:shadow-md transition-shadow animate-fade-in relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>
                    <div className="flex justify-between items-start mb-[12px]">
                      <div>
                        <span className="font-label-sm text-[12px] text-on-surface-variant">#{o.order.id.split("-")[0]}</span>
                        <h3 className="font-label-md text-[14px] text-on-surface font-bold mt-1">Due ASAP</h3>
                      </div>
                      <span className="font-label-md text-[14px] font-bold text-primary">₹{Number(o.order.total_amount).toFixed(2)}</span>
                    </div>
                    <ul className="font-body-sm text-[14px] text-on-surface space-y-2 mb-[16px]">
                      {o.items.map((item) => (
                        <li key={item.id} className="flex gap-[8px]">
                          <span className="font-bold text-primary">{item.quantity}x</span>
                          <span>{item.name_snapshot}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-[8px]">
                      {o.order.status === "PENDING" ? (
                        // Payment still being taken by the worker — no action yet.
                        <div className="w-full flex items-center justify-center gap-[8px] bg-surface-container-high text-on-surface-variant border border-outline-variant/50 py-2 rounded-md font-label-md text-[14px]">
                          <span className="material-symbols-outlined text-[18px] text-tertiary animate-pulse">hourglass_top</span>
                          Processing payment…
                        </div>
                      ) : (
                        // CONFIRMED (paid) — owner must accept to start prep. This is
                        // the manual gate that replaces the old auto-progression.
                        <button
                          onClick={() => acceptOrder(o.order.id)}
                          disabled={acceptingIds.has(o.order.id)}
                          className="w-full flex items-center justify-center gap-[8px] bg-primary text-on-primary py-2 rounded-md font-label-md text-[14px] font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed squishy-btn"
                        >
                          {acceptingIds.has(o.order.id) ? (
                            <>
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary"></span>
                              Accepting…
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>skillet</span>
                              Accept &amp; Prep
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Preparing */}
            <div className="flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-surface p-[16px] border-b border-outline-variant/30 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-[8px]">
                  <span className="w-3 h-3 rounded-full bg-tertiary"></span>
                  <h2 className="font-label-lg text-[16px] font-bold text-on-surface">Preparing</h2>
                </div>
                <span className="bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded-full font-label-sm text-[12px]">
                  {prepOrders.length}
                </span>
              </div>
              <div className="p-[16px] overflow-y-auto flex-1 space-y-[16px] custom-scrollbar">
                {prepOrders.map((o) => (
                  <div key={o.order.id} className="bg-surface border border-outline-variant/50 rounded-lg p-[16px] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-tertiary"></div>
                    <div className="flex justify-between items-start mb-[12px]">
                      <div>
                        <span className="font-label-sm text-[12px] text-on-surface-variant">#{o.order.id.split("-")[0]}</span>
                        <h3 className="font-label-md text-[14px] text-on-surface font-bold mt-1">Preparing</h3>
                      </div>
                    </div>
                    <ul className="font-body-sm text-[14px] text-on-surface space-y-2 mb-[16px] opacity-80">
                      {o.items.map((item) => (
                        <li key={item.id} className="flex gap-[8px]">
                          <span className="font-bold text-tertiary">{item.quantity}x</span>
                          <span className="line-through">{item.name_snapshot}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="w-full flex items-center justify-center gap-[8px] bg-surface-container-high text-on-surface-variant border border-outline-variant/50 py-2 rounded-md font-label-md text-[14px]">
                      <span className="material-symbols-outlined text-[18px] text-primary animate-pulse">two_wheeler</span>
                      Ready — awaiting courier
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Ready / Completed */}
            <div className="flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm opacity-80 hover:opacity-100 transition-opacity">
              <div className="bg-surface p-[16px] border-b border-outline-variant/30 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-[8px]">
                  <span className="w-3 h-3 rounded-full bg-outline"></span>
                  <h2 className="font-label-lg text-[16px] font-bold text-on-surface">Completed</h2>
                </div>
              </div>
              <div className="p-[16px] overflow-y-auto flex-1 space-y-[16px] custom-scrollbar">
                {readyOrders.map((o) => (
                  <div key={o.order.id} className="bg-surface border border-outline-variant/30 rounded-lg p-[16px] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-outline-variant"></div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-label-sm text-[12px] text-on-surface-variant">#{o.order.id.split("-")[0]}</span>
                        <h3 className="font-label-md text-[14px] text-on-surface-variant mt-1">{o.order.status}</h3>
                      </div>
                      <span className="material-symbols-outlined text-outline-variant">check_circle</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
