"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Restaurant } from "@/lib/types";

export default function HomePage() {
  // Fetch the list of restaurants for the landing grid.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => apiGet<{ restaurants: Restaurant[] }>("/restaurants"),
  });

  if (isLoading) return <p className="p-8 text-zinc-500">Loading restaurants…</p>;
  if (isError) return <p className="p-8 text-red-500">Failed to load restaurants.</p>;

  const restaurants = data?.restaurants ?? [];

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Restaurants</h1>

      {restaurants.length === 0 ? (
        <p className="text-zinc-500">No restaurants yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <Link
              key={r.id}
              href={`/restaurants/${r.id}`}
              className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              <h2 className="text-lg font-medium">{r.name}</h2>
              {r.description && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{r.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
