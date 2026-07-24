"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useCart } from "@/store/cartStore";
import type { MenuItem } from "@/lib/types";

// Restaurant menu page. Route param read via useParams() (client) so we avoid
// Next 16's async-params rule. Lists dishes with an "Add" button → Zustand cart.
export default function RestaurantMenuPage() {
  const { id } = useParams<{ id: string }>();
  const add = useCart((s) => s.add);

  const { data, isLoading } = useQuery({
    queryKey: ["menu", id],
    queryFn: () => apiGet<{ items: MenuItem[] }>(`/menu/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <p>Loading menu…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Menu</h1>
      <div className="space-y-3">
        {data?.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
            <div>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-neutral-500">{item.description}</p>
              <p className="mt-1 text-sm font-medium">₹{item.price}</p>
            </div>
            <button
              onClick={() => add(item)}
              disabled={!item.is_available}
              className="rounded bg-neutral-900 px-3 py-1 text-sm text-white disabled:opacity-40"
            >
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
