"use client";

import Link from "next/link";
import { useState } from "react";
import { TopNavBar } from "@/components/TopNavBar";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Restaurant } from "@/lib/types";

export default function Home() {
  const [query, setQuery] = useState("");

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () =>
      apiGet<{ restaurants: Restaurant[] }>("/restaurants").then(
        (d) => d.restaurants
      ),
  });

  // Client-side search over the loaded restaurants — matches name or description.
  const q = query.trim().toLowerCase();
  const filtered = q
    ? restaurants?.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false)
      )
    : restaurants;

  return (
    <>
      <TopNavBar />
      <main className="min-h-screen pt-[88px] flex flex-col">
        {/* Hero */}
        <section className="relative h-[600px] md:h-[700px] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage:
                'url("https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920&q=80")',
            }}
          />
          <div className="absolute inset-0 hero-gradient" />
          <div className="relative z-10 w-full max-w-[1280px] px-[24px] mx-auto text-center flex flex-col items-center">
            <h1 className="font-display-lg text-[36px] md:text-[48px] text-white mb-[24px] max-w-3xl mx-auto leading-tight">
              Your city's best food, delivered
            </h1>
            {/* Search bar — filters the restaurant grid below */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="glass-panel rounded-full p-[8px] flex items-center w-full max-w-2xl shadow-[0_8px_32px_0_rgba(181,35,48,0.15)] mt-[16px] hover:shadow-[0_12px_48px_0_rgba(181,35,48,0.2)] transition-shadow"
            >
              <div className="flex-grow flex items-center px-4">
                <span className="material-symbols-outlined mr-2 text-on-surface-variant text-[20px]">
                  search
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 p-0 font-body-md text-[16px] w-full placeholder:text-on-surface-variant/70 text-on-surface outline-none"
                  placeholder="Search restaurants"
                  type="text"
                />
              </div>
              <button
                type="submit"
                className="bg-primary hover:bg-on-primary-fixed-variant text-white px-[32px] py-3 rounded-full font-label-md text-[14px] transition-colors shadow-sm shrink-0"
              >
                Find Food
              </button>
            </form>
          </div>
        </section>

        {/* Featured Collections */}
        <section className="max-w-[1280px] mx-auto px-[24px] py-[32px] w-full mb-[48px]">
          <h2 className="font-headline-md text-[32px] font-bold text-on-surface mb-[32px]">
            Featured Collections
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-[64px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : filtered && filtered.length === 0 ? (
            <div className="text-center py-[64px] text-on-surface-variant font-body-md text-[16px]">
              No restaurants match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
              {filtered?.map((restaurant) => (
                <Link href={`/restaurants/${restaurant.id}`} key={restaurant.id}>
                  <div className="group bg-surface-container-lowest rounded-[16px] border border-outline-variant/30 overflow-hidden shadow-[0_8px_32px_0_rgba(181,35,48,0.04)] hover:shadow-[0_12px_48px_0_rgba(181,35,48,0.12)] hover:-translate-y-1 transition-all duration-300 relative">
                    <div className="h-48 w-full relative overflow-hidden">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={
                          restaurant.image_url ||
                          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"
                        }
                        alt={restaurant.name}
                      />
                    </div>
                    <div className="p-[16px]">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-title-lg text-[24px] font-semibold text-on-surface">
                          {restaurant.name}
                        </h3>
                        <div className="flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded-md shrink-0">
                          <span
                            className="material-symbols-outlined text-[16px] text-primary"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          <span className="font-label-md text-[14px] text-on-surface">
                            4.8
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="font-label-md text-[12px] text-on-surface-variant bg-surface-container px-2 py-1 rounded-sm">
                          {restaurant.description || "Premium Cuisine"}
                        </span>
                        <span className="font-label-md text-[12px] text-on-surface-variant bg-surface-container px-2 py-1 rounded-sm">
                          ₹₹
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-on-surface-variant border-t border-outline-variant/30 pt-3">
                        <div className="flex items-center gap-1 font-body-md text-[14px]">
                          <span className="material-symbols-outlined text-[18px]">
                            schedule
                          </span>{" "}
                          25-35 min
                        </div>
                        <div className="flex items-center gap-1 font-body-md text-[14px]">
                          <span className="material-symbols-outlined text-[18px]">
                            local_shipping
                          </span>{" "}
                          Free
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
