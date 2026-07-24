"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem } from "@/lib/types";

export interface CartLine {
  item: MenuItem;
  quantity: number;
}

interface CartState {
  restaurantId: string | null;
  lines: CartLine[];
  // Add a dish. Cart is single-restaurant (backend rule): adding from a different
  // restaurant clears the cart first.
  add: (item: MenuItem) => void;
  remove: (menuItemId: string) => void;
  setQty: (menuItemId: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      lines: [],
      add: (item) =>
        set((state) => {
          // Switching restaurants → start a fresh cart.
          const lines = state.restaurantId === item.restaurant_id ? state.lines : [];
          const existing = lines.find((l) => l.item.id === item.id);
          const nextLines = existing
            ? lines.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
            : [...lines, { item, quantity: 1 }];
          return { restaurantId: item.restaurant_id, lines: nextLines };
        }),
      remove: (menuItemId) =>
        set((state) => {
          const lines = state.lines.filter((l) => l.item.id !== menuItemId);
          return { lines, restaurantId: lines.length ? state.restaurantId : null };
        }),
      setQty: (menuItemId, quantity) =>
        set((state) => ({
          lines: state.lines
            .map((l) => (l.item.id === menuItemId ? { ...l, quantity } : l))
            .filter((l) => l.quantity > 0),
        })),
      clear: () => set({ restaurantId: null, lines: [] }),
      // Sum of price × qty across all lines (price is a string from pg).
      total: () => get().lines.reduce((sum, l) => sum + Number(l.item.price) * l.quantity, 0),
    }),
    { name: "forkflow-cart" }
  )
);
