"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiGet, apiDelete } from "@/lib/api";
import type { RestaurantFull } from "@/lib/types";

export default function AdminRestaurantsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RestaurantFull | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "restaurants"],
    queryFn: () =>
      apiGet<{ restaurants: RestaurantFull[]; count: number }>("/restaurants/admin/all"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/restaurants/admin/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "restaurants"] });
      showToast("Restaurant deleted");
      setDeleteTarget(null);
    },
    onError: () => {
      showToast("Failed to delete restaurant", false);
      setDeleteTarget(null);
    },
  });

  const all = data?.restaurants ?? [];
  const filtered = all.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.cuisine ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.ok
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-primary/20 text-primary border border-primary/30"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-[20px] font-bold text-on-surface mb-2">Delete Restaurant</h3>
            <p className="text-on-surface-variant text-[14px] mb-6">
              Permanently delete{" "}
              <span className="text-on-surface font-semibold">{deleteTarget.name}</span>? This will also remove all associated menu items and cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                id="cancel-delete-restaurant"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[14px] hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-restaurant"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-error text-on-error text-[14px] font-semibold hover:bg-error/90 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-[32px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[32px] font-bold text-on-surface mb-[4px]">Restaurants</h1>
          <p className="font-body-md text-[16px] text-on-surface-variant">
            {data?.count ?? 0} total restaurants (including closed)
          </p>
        </div>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            id="restaurants-search"
            type="text"
            placeholder="Search by name or cuisine…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface text-[14px] placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/60 w-72 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest dark:bg-surface-dim border border-white/40 shadow-[0_8px_32px_0_rgba(181,35,48,0.04)] rounded-xl backdrop-blur-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-secondary font-label-md text-[13px] bg-surface-container/30">
                  <th className="py-3 px-6 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold">Cuisine</th>
                  <th className="py-3 px-4 font-semibold">Address</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-outline-variant/10 hover:bg-surface-container/20 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        {r.image_url ? (
                          <img
                            src={r.image_url}
                            alt={r.name}
                            className="h-8 w-8 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-[16px]">storefront</span>
                          </div>
                        )}
                        <Link
                          href={`/restaurants/${r.id}`}
                          className="font-body-md text-[14px] text-on-surface font-medium hover:text-primary transition-colors"
                        >
                          {r.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-body-md text-[14px] text-on-surface-variant">
                      {r.cuisine ?? "—"}
                    </td>
                    <td className="py-3.5 px-4 font-body-md text-[13px] text-on-surface-variant max-w-[180px] truncate">
                      {r.address ?? "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${
                          r.is_open
                            ? "bg-green-500/15 text-green-400 border border-green-500/30"
                            : "bg-outline-variant/20 text-on-surface-variant border border-outline-variant/30"
                        }`}
                      >
                        {r.is_open ? "Open" : "Closed"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-body-md text-[13px] text-on-surface-variant">
                      {new Date(r.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        id={`delete-restaurant-${r.id}`}
                        onClick={() => setDeleteTarget(r)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                        title="Delete restaurant"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant text-[14px]">
                      <span className="material-symbols-outlined text-[40px] block mb-2 opacity-40">storefront</span>
                      No restaurants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
