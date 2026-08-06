"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { TopNavBar } from "@/components/TopNavBar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useOrderTracking } from "@/hooks/useOrderTracking";
import type { OrderView, OrderStatus, DeliveryAssignment } from "@/lib/types";

const LiveDeliveryMap = dynamic(() => import("@/components/LiveDeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  ),
});

export default function LiveOrderTracking({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiGet<OrderView>(`/orders/${id}`),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const socket = getSocket();
    const onStatus = (p: { orderId: string }) => {
      if (p.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ["order", id] });
      }
    };
    socket.on("order:status_updated", onStatus);
    return () => { socket.off("order:status_updated", onStatus); };
  }, [id, queryClient]);

  const initialStatus: OrderStatus = data?.order.status ?? "PENDING";
  const { status: liveStatus, location: driverLoc } = useOrderTracking(id, initialStatus);

  const { data: assignment } = useQuery({
    queryKey: ["delivery-assignment", id],
    queryFn: () =>
      apiGet<{ assignment: DeliveryAssignment }>(`/delivery/${id}`).then((d) => d.assignment),
    retry: false,
  });

  const mapPosition = driverLoc
    ? { lat: driverLoc.lat, lng: driverLoc.lng }
    : assignment?.current_lat != null && assignment?.current_lng != null
      ? { lat: assignment.current_lat, lng: assignment.current_lng }
      : null;

  const [customerPos, setCustomerPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (p) => setCustomerPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => console.warn("[tracking] customer geolocation unavailable:", err.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (driverLoc) {
      console.log(
        `[tracking] driver GPS → lat ${driverLoc.lat}, lng ${driverLoc.lng} ` +
          `(received ${new Date(driverLoc.at).toLocaleTimeString()})`
      );
    }
  }, [driverLoc]);

  if (isLoading || !data) {
    return (
      <>
        <TopNavBar />
        <main className="min-h-screen pt-16 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
      </>
    );
  }

  const statusMap: Record<OrderStatus, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    PREPARING: 2,
    OUT_FOR_DELIVERY: 3,
    DELIVERED: 4,
    CANCELLED: -1,
  };

  const currentStep = liveStatus ? statusMap[liveStatus] : statusMap[data.order.status];

  return (
    <>
      <TopNavBar />
      {}
      <main className="relative min-h-screen pt-16 pb-[64px]">
        {}
        <div className="absolute inset-0 z-0 h-[614px] md:h-screen w-full">
          <LiveDeliveryMap driver={mapPosition} customer={customerPos} />
          {}
          <div className="absolute inset-0 map-gradient md:bg-gradient-to-r md:from-background md:via-background/80 md:to-transparent z-[400] pointer-events-none"></div>
        </div>

        {}
        <div className="relative z-[500] w-full md:min-h-[calc(100vh-64px)] flex px-[20px] md:px-[48px] mt-4 md:mt-0 pointer-events-none">
          {}
          <div className="w-full md:w-5/12 lg:w-1/3 flex flex-col gap-[24px] py-6 md:py-10 pointer-events-auto max-h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
            {}
            <div className="glass-card rounded-xl p-[24px] flex flex-col items-center text-center">
              <span className="font-label-md text-[14px] text-primary uppercase tracking-wider mb-2">
                Status
              </span>
              <h1 className="font-display-lg text-[48px] text-on-surface mb-1 truncate w-full">
                {liveStatus || data.order.status}
              </h1>
              {currentStep === 3 && <p className="font-body-md text-[16px] text-on-surface-variant">Arriving soon</p>}
              {}
              {mapPosition ? (
                <div className="mt-3 flex items-center gap-2 bg-surface-container-high/60 rounded-full px-3 py-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    two_wheeler
                  </span>
                  <span className="font-label-sm text-[12px] text-on-surface-variant">
                    Rider at {mapPosition.lat.toFixed(5)}, {mapPosition.lng.toFixed(5)}
                  </span>
                </div>
              ) : (
                <p className="font-label-sm text-[12px] text-on-surface-variant mt-3">
                  Waiting for rider location…
                </p>
              )}
            </div>

            {}
            <div className="glass-card rounded-xl p-[24px]">
              <h2 className="font-headline-md text-[24px] text-on-surface mb-[24px]">Order Status</h2>
              <div className="relative pl-[8px]">
                <div className="absolute left-[15px] top-4 bottom-8 w-[2px] bg-surface-container-high"></div>

                {}
                <div className="relative flex items-start gap-[24px] mb-[40px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-surface ${currentStep >= 1 ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-sm font-bold" style={{ fontVariationSettings: currentStep >= 1 ? "'FILL' 1" : "'FILL' 0" }}>
                      check
                    </span>
                  </div>
                  <div className="pt-1">
                    <h3 className={`font-label-md text-[14px] ${currentStep >= 1 ? "text-on-surface font-bold" : "text-on-surface-variant"}`}>Order Confirmed</h3>
                  </div>
                </div>

                {}
                <div className="relative flex items-start gap-[24px] mb-[40px]">
                  {currentStep >= 2 && <div className="absolute left-[15px] top-[-30px] bottom-4 w-[2px] bg-primary z-0"></div>}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-surface ${currentStep >= 2 ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-sm font-bold" style={{ fontVariationSettings: currentStep >= 2 ? "'FILL' 1" : "'FILL' 0" }}>
                      skillet
                    </span>
                  </div>
                  <div className="pt-1">
                    <h3 className={`font-label-md text-[14px] ${currentStep >= 2 ? "text-on-surface font-bold" : "text-on-surface-variant"}`}>Preparing your meal</h3>
                  </div>
                </div>

                {}
                <div className="relative flex items-start gap-[24px] mb-[40px]">
                  {currentStep >= 3 && <div className="absolute left-[15px] top-[-30px] bottom-4 w-[2px] bg-primary z-0"></div>}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 border-2 ${currentStep === 3 ? "bg-primary-container text-on-primary-container border-primary tracker-pulse" : currentStep > 3 ? "bg-primary text-on-primary border-surface" : "bg-surface-container-high text-on-surface-variant border-surface"}`}>
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: currentStep >= 3 ? "'FILL' 1" : "'FILL' 0" }}>
                      two_wheeler
                    </span>
                  </div>
                  <div className="pt-1">
                    <h3 className={`font-label-md text-[14px] ${currentStep >= 3 ? "text-on-surface font-bold" : "text-on-surface-variant"}`}>Out for Delivery</h3>
                    {currentStep === 3 && <p className="font-label-sm text-[12px] text-on-surface-variant">Rider is heading your way</p>}
                  </div>
                </div>

                {}
                <div className="relative flex items-start gap-[24px]">
                  {currentStep >= 4 && <div className="absolute left-[15px] top-[-30px] bottom-4 w-[2px] bg-primary z-0"></div>}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-surface ${currentStep >= 4 ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: currentStep >= 4 ? "'FILL' 1" : "'FILL' 0" }}>home</span>
                  </div>
                  <div className="pt-1">
                    <h3 className={`font-label-md text-[14px] ${currentStep >= 4 ? "text-on-surface font-bold" : "text-on-surface-variant"}`}>Delivered</h3>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="glass-card rounded-xl p-[24px]">
              <div className="flex justify-between items-start mb-[16px] pb-[16px] border-b border-outline-variant/30">
                <div>
                  <h2 className="font-headline-md text-[24px] text-on-surface">Order Summary</h2>
                  <p className="font-label-sm text-[12px] text-on-surface-variant">ID: {data.order.id.split("-")[0]}</p>
                </div>
              </div>
              <ul className="font-body-md text-[16px] text-on-surface space-y-2 mb-[24px]">
                {data.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.quantity}x {item.name_snapshot}</span>
                    <span className="font-label-md text-[14px]">₹{(Number(item.price_snapshot) * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center pt-[16px] border-t border-outline-variant/30">
                <span className="font-label-md text-[14px] text-on-surface">Total</span>
                <span className="font-headline-md text-[24px] text-primary">₹{Number(data.order.total_amount).toFixed(2)}</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant flex flex-col md:flex-row justify-between items-center px-[48px] py-[40px] mt-[64px] font-label-sm text-[12px] relative z-50">
        <div className="font-headline-md text-[24px] text-primary mb-4 md:mb-0">ForkFlow</div>
        <div className="text-on-surface-variant text-center md:text-left mb-4 md:mb-0">
          © 2024 ForkFlow Inc. Concierge Culinary Services.
        </div>
        <div className="flex gap-[24px]">
          <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors">Partner Program</Link>
        </div>
      </footer>
    </>
  );
}
