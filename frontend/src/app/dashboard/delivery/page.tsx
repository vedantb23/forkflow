"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopNavBar } from "@/components/TopNavBar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { DeliveryFeedItem } from "@/lib/types";
import { useAuth } from "@/store/authStore";

export default function DeliveryDashboard() {
  const [isActive, setIsActive] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["delivery-orders"],
    queryFn: () =>
      apiGet<{ orders: DeliveryFeedItem[] }>("/delivery/available").then((d) => d.orders),
    refetchInterval: 10_000,
  });

  const claimTrip = useMutation({
    mutationFn: (orderId: string) => apiPost(`/delivery/${orderId}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-orders"] });
    },
  });

  const completeTrip = useMutation({
    mutationFn: (orderId: string) => apiPatch(`/delivery/${orderId}/status`, { status: "DELIVERED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-orders"] });
    },
  });

  const myActiveOrders =
    orders?.filter(
      (o) => o.order.status === "OUT_FOR_DELIVERY" && o.assignment?.partner_id === user?.id
    ) ?? [];
  const activeOrder = myActiveOrders[0];
  const availableOrders = orders?.filter((o) => o.order.status === "PREPARING") || [];

  useEffect(() => {
    const socket = getSocket();

    socket.emit("delivery:join");

    const onStatus = () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-orders"] });
    };

    const onConnect = () => {
      socket.emit("delivery:join");
    };

    socket.on("order:status_updated", onStatus);
    socket.on("connect", onConnect);

    return () => {
      socket.off("order:status_updated", onStatus);
      socket.off("connect", onConnect);
    };
  }, [queryClient]);

  const updateLocation = useMutation({
    mutationFn: ({ orderId, lat, lng }: { orderId: string; lat: number; lng: number }) =>
      apiPatch(`/delivery/${orderId}/location`, { lat, lng }),
  });

  useEffect(() => {
    if (!activeOrder) return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updateLocation.mutate({
          orderId: activeOrder.order.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder?.order.id]);

  const links = [
    { icon: "two_wheeler", label: "Active Map", href: "/dashboard/delivery" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavBar />
        <div className="flex h-screen pt-16">
          <DashboardSidebar title="Delivery" subtitle="Loading..." links={links} />
          <main className="flex-1 md:ml-64 p-[24px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      <div className="md:hidden">
        <TopNavBar />
      </div>

      <div className="flex flex-1 pt-16 md:pt-0">
        <DashboardSidebar
          title={user?.name || "Driver Portal"}
          subtitle="Pro Courier"
          links={links}
          userImage="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
        />

        <main className="flex-1 md:ml-64 relative flex flex-col">
          <div className="absolute inset-0 z-0 h-full w-full">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYoIL9ebqjIYS9E6oyYjRBofqGgCx7UBXGiJLjpUkeJkJGWxXe_v1xL0j02JDXq2opvlEMsDvu1abJIVMo8vMnim7bbGrEhg7gclRLieVC0-m8Jtg4LwgqHLwQvwwuT9XKYc8NErvUblWIoStpYnS1eRf8MyYcnyDml7QAKvUUV-8ctEGT1Gv7f2Bo4Wob1wabVYa-srjQPq_CzvB4gAEmNUoXAE8dc534XDqzeNoIiKO0uR3ilIgigR4Z5xlOUV0PNix7gha4sBA"
              alt="Map View"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] z-10"></div>
          </div>

          <div className="relative z-20 w-full p-[20px] md:p-[48px] flex justify-between items-start pointer-events-none">
            <div className="pointer-events-auto">
              <h1 className="font-headline-lg text-[32px] text-on-surface bg-surface/80 backdrop-blur-md px-4 py-2 rounded-lg inline-block">Active Map</h1>
            </div>

            <div className="glass-panel px-[24px] py-[12px] rounded-full flex items-center gap-[16px] shadow-sm pointer-events-auto">
              <span className={`font-label-md text-[14px] ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                {isActive ? 'Online & Searching' : 'Offline'}
              </span>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative w-[52px] h-[28px] rounded-full transition-colors duration-300 ${isActive ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant'}`}
              >
                <div className={`absolute top-[4px] left-[4px] w-[20px] h-[20px] rounded-full bg-white transition-transform duration-300 shadow-sm ${isActive ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>

          <div className="relative z-20 mt-auto p-[20px] md:p-[48px] pointer-events-none flex flex-col gap-[24px] lg:flex-row lg:items-end">

            {}
            <div className="w-full lg:w-1/2 flex flex-col gap-[16px] pointer-events-auto">
              {isActive ? (
                <>
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <span className="w-3 h-3 rounded-full bg-primary animate-pulse"></span>
                    <h2 className="font-headline-md text-[20px] text-on-surface bg-surface/80 backdrop-blur-md px-2 py-1 rounded-md inline-block">
                      Available Trips ({availableOrders.length})
                    </h2>
                  </div>

                  <div className="flex flex-col gap-[16px]">
                    {availableOrders.length === 0 ? (
                      <div className="glass-card rounded-xl p-[24px] w-full border border-primary/30 flex items-center justify-center">
                        <span className="text-on-surface-variant font-label-md">Looking for trips...</span>
                      </div>
                    ) : (
                      availableOrders.map((o) => (
                        <div key={o.order.id} className="glass-card rounded-xl p-[24px] w-full border border-primary/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-transform">
                          <div className="flex justify-between items-start mb-[16px] border-b border-outline-variant/30 pb-[12px]">
                            <div>
                              <h3 className="font-label-lg text-[16px] text-on-surface font-bold">Restaurant Pickup</h3>
                              <p className="font-label-sm text-[12px] text-on-surface-variant">Order #{o.order.id.split("-")[0]}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-headline-md text-[20px] text-primary">₹{Number(o.order.total_amount).toFixed(2)}</span>
                            </div>
                          </div>
                          <ul className="font-body-md text-[14px] text-on-surface space-y-1 mb-[16px]">
                            {o.items.map((item) => (
                              <li key={item.id} className="flex gap-[8px]">
                                <span className="font-bold text-primary">{item.quantity}x</span>
                                <span>{item.name_snapshot}</span>
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => claimTrip.mutate(o.order.id)}
                            disabled={claimTrip.isPending || !!activeOrder}
                            className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md text-[14px] hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-50"
                          >
                            {activeOrder ? "Finish current trip first" : "Accept Trip"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="glass-card rounded-xl p-[32px] w-full border border-outline-variant/30 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-[16px]">
                    <span className="material-symbols-outlined text-[32px] text-on-surface-variant">bedtime</span>
                  </div>
                  <h2 className="font-headline-md text-[24px] text-on-surface mb-[8px]">You are offline</h2>
                  <p className="font-body-md text-[16px] text-on-surface-variant">Go online to start receiving delivery requests.</p>
                </div>
              )}
            </div>

            {}
            {activeOrder && (
              <div className="w-full lg:w-1/2 flex justify-end pointer-events-auto">
                <div className="glass-card rounded-xl p-[24px] w-full border-2 border-primary shadow-[0_20px_40px_rgb(0,0,0,0.2)] order-pulse">
                  <div className="flex items-center justify-between mb-[24px]">
                    <div className="flex items-center gap-[8px]">
                      <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        two_wheeler
                      </span>
                      <h2 className="font-headline-md text-[24px] text-on-surface">Active Delivery</h2>
                    </div>
                    <span className="font-headline-md text-[20px] text-primary">₹{Number(activeOrder.order.total_amount).toFixed(2)}</span>
                  </div>

                  <div className="mb-[24px]">
                    <p className="font-label-sm text-[12px] text-on-surface-variant mb-[8px]">Order #{activeOrder.order.id.split("-")[0]}</p>
                    <ul className="font-body-md text-[14px] text-on-surface space-y-1">
                      {activeOrder.items.map((item) => (
                        <li key={item.id} className="flex gap-[8px]">
                          <span className="font-bold text-primary">{item.quantity}x</span>
                          <span>{item.name_snapshot}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative pl-[8px] mb-[32px]">
                    <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-outline-variant/30"></div>
                    <div className="relative flex items-start gap-[16px] mb-[24px]">
                      <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center z-10 shrink-0 border-2 border-surface">
                        <span className="material-symbols-outlined text-sm">storefront</span>
                      </div>
                      <div className="pt-1">
                        <h3 className="font-label-md text-[14px] text-on-surface">Restaurant Pickup</h3>
                        <p className="font-label-sm text-[12px] text-on-surface-variant">Picked up</p>
                      </div>
                    </div>
                    <div className="relative flex items-start gap-[16px]">
                      <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center z-10 shrink-0 border-2 border-primary tracker-pulse">
                        <span className="material-symbols-outlined text-sm">person</span>
                      </div>
                      <div className="pt-1">
                        <h3 className="font-label-md text-[14px] text-on-surface">Customer Dropoff</h3>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => completeTrip.mutate(activeOrder.order.id)}
                    disabled={completeTrip.isPending}
                    className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md text-[14px] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {completeTrip.isPending ? "Completing..." : "Mark Delivered"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
