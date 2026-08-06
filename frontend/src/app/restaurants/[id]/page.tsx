"use client";

import { useState, use } from "react";
import Link from "next/link";
import { TopNavBar } from "@/components/TopNavBar";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useCart } from "@/store/cartStore";
import type { Restaurant, MenuItem } from "@/lib/types";

export default function RestaurantMenu({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: restaurant, isLoading: resLoading } = useQuery({
    queryKey: ["restaurant", id],

    queryFn: () => apiGet<{ restaurant: Restaurant }>(`/restaurants/${id}`).then((d) => d.restaurant),
  });

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["restaurant", id, "menu"],

    queryFn: () => apiGet<{ items: MenuItem[] }>(`/menu/${id}`).then((d) => d.items),
  });

  const cartLines = useCart((state) => state.lines);
  const addToCart = useCart((state) => state.add);
  const cartTotal = useCart((state) => state.total());

  const cartItemsCount = cartLines.reduce((acc, line) => acc + line.quantity, 0);

  if (resLoading || menuLoading) {
    return (
      <>
        <TopNavBar />
        <main className="flex-grow pt-16 min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
      </>
    );
  }

  if (!restaurant) {
    return (
      <>
        <TopNavBar />
        <main className="flex-grow pt-16 min-h-screen flex items-center justify-center">
          <div>Restaurant not found.</div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopNavBar />
      <main className="flex-grow pt-16 pb-[100px] min-h-screen">
        {}
        <div className="relative w-full h-[307px] md:h-[460px] bg-surface-variant overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center w-full h-full"
            style={{
              backgroundImage: `url('${restaurant.image_url || "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1600&q=80"}')`,
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>

          {}
          <div className="absolute top-0 right-8 md:right-24 z-20 animate-swing flex flex-col items-center drop-shadow-2xl">
            <div className="flex justify-between w-16 md:w-20 px-2">
              <div className="w-[2px] h-8 md:h-12 bg-white/70 shadow-sm"></div>
              <div className="w-[2px] h-8 md:h-12 bg-white/70 shadow-sm"></div>
            </div>
            <div className={`px-4 md:px-6 py-1 md:py-2 rounded-md text-white font-black text-xs md:text-lg tracking-widest border-b-[4px] shadow-lg ${
              restaurant.is_open
                ? 'bg-emerald-500 border-emerald-700'
                : 'bg-rose-500 border-rose-700'
            }`}>
              {restaurant.is_open ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </div>

        {}
        <div className="max-w-[1440px] mx-auto px-[20px] md:px-[48px] -mt-[64px] relative z-10">
          <div className="bg-surface dark:bg-surface-dim rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-[40px] border border-outline-variant/30 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-[24px]">
              <div>
                <div className="flex items-center gap-[16px] mb-[8px]">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-label-sm text-[12px] uppercase tracking-wider">
                    Premium Delivery
                  </span>
                </div>
                <h1 className="font-headline-lg-mobile md:font-display-lg text-[28px] md:text-[48px] text-on-background mb-[16px]">
                  {restaurant.name}
                </h1>
                <p className="font-body-md text-[16px] text-on-surface-variant flex items-center gap-[8px]">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                  {restaurant.address || "Address"}
                </p>
                {restaurant.description && (
                  <p className="font-body-md text-[14px] text-on-surface-variant mt-2 max-w-2xl">{restaurant.description}</p>
                )}
              </div>
            </div>
          </div>

          {}
          <div className="mt-[64px] grid grid-cols-1 lg:grid-cols-12 gap-[24px] relative">
            {}
            <div className="lg:col-span-3">
              <div className="sticky top-[100px] bg-surface/80 backdrop-blur-md rounded-lg p-[16px] border border-outline-variant/20 overflow-x-auto no-scrollbar">
                <nav className="flex flex-row lg:flex-col gap-[8px] lg:gap-[16px]">
                  <Link href="#menu" className="whitespace-nowrap px-[16px] py-2 rounded-md font-label-md text-[14px] bg-primary-container text-on-primary-container transition-colors">
                    Menu Items
                  </Link>
                </nav>
              </div>
            </div>

            {}
            <div className="lg:col-span-9 space-y-[64px] pb-[64px]">
              <section className="scroll-mt-[100px]" id="menu">
                <h2 className="font-headline-md text-[24px] text-on-background mb-[24px] pb-[8px] border-b border-outline-variant/30">
                  Menu Items
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
                  {menu && menu.map((item) => (
                    <div key={item.id} className="bg-surface rounded-lg p-[16px] border border-outline-variant/30 hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-all duration-300 flex flex-col justify-between group active:scale-[0.98]">
                      <div className="flex gap-[24px] mb-[16px]">
                        <div className="flex-grow">
                          <h3 className="font-label-md text-[14px] text-on-background mb-[8px]">{item.name}</h3>
                          {item.description && (
                            <p className="font-body-md text-[14px] text-on-surface-variant line-clamp-2 mb-[16px]">
                              {item.description}
                            </p>
                          )}
                          <span className="font-label-md text-[14px] text-on-background">₹{item.price}</span>
                        </div>
                        {item.image_url && (
                          <div className="w-[100px] h-[100px] rounded-md overflow-hidden flex-shrink-0 bg-surface-container-low">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.is_available}
                        className="w-full py-2 bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary font-label-md text-[14px] rounded-md transition-colors flex items-center justify-center gap-[8px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span> {item.is_available ? "Add" : "Sold Out"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {}
      <div
        className={`fixed bottom-0 left-0 w-full z-50 p-[20px] pb-[24px] flex justify-center pointer-events-none transition-all duration-300 ${
          cartItemsCount > 0 ? "cart-active" : "hidden opacity-0 translate-y-[100%]"
        }`}
      >
        <Link href="/cart" className="pointer-events-auto">
          <div className="bg-inverse-surface dark:bg-inverse-surface text-inverse-on-surface w-full min-w-[320px] max-w-md rounded-xl p-[16px] shadow-[0_20px_40px_rgb(0,0,0,0.2)] glass-nav flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-center gap-[16px]">
              <div className="bg-primary-container text-on-primary-container w-8 h-8 rounded-full flex items-center justify-center font-label-md text-[14px]">
                {cartItemsCount}
              </div>
              <span className="font-label-md text-[14px]">View Order</span>
            </div>
            <span className="font-headline-md text-[24px]">₹{cartTotal.toFixed(2)}</span>
          </div>
        </Link>
      </div>

      <Footer />
    </>
  );
}
