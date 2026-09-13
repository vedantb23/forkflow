"use client";

import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import type { OrderView, OrderStatus } from "@/lib/types";

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  CONFIRMED: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  PREPARING: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  OUT_FOR_DELIVERY: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  DELIVERED: "bg-green-500/15 text-green-400 border border-green-500/30",
  CANCELLED: "bg-outline-variant/20 text-on-surface-variant border border-outline-variant/30",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold whitespace-nowrap ${STATUS_STYLES[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => apiGet<{ orders: OrderView[]; count: number }>("/orders/admin"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      apiPatch(`/orders/admin/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      showToast("Order status updated");
    },
    onError: () => showToast("Failed to update status", false),
  });

  const allOrders = data?.orders ?? [];
  const filtered =
    statusFilter === "ALL"
      ? allOrders
      : allOrders.filter((o) => o.order.status === statusFilter);

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

      {/* Page Header */}
      <div className="mb-[32px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[32px] font-bold text-on-surface mb-[4px]">Orders</h1>
          <p className="font-body-md text-[16px] text-on-surface-variant">
            {data?.count ?? 0} total orders across all users
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">filter_list</span>
          <select
            id="orders-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "ALL")}
            className="px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface text-[14px] focus:outline-none focus:border-primary/60 transition-colors cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
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
                  <th className="py-3 px-6 font-semibold">Order ID</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Total</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Update Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ order, items }) => (
                  <Fragment key={order.id}>
                    <tr
                      className="border-b border-outline-variant/10 hover:bg-surface-container/20 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <span className="font-mono text-[13px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                          {order.id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-4 font-body-md text-[14px] text-on-surface font-semibold">
                        ₹{Number(order.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-body-md text-[13px] text-on-surface-variant">
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          id={`order-status-${order.id}`}
                          defaultValue={order.status}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              orderId: order.id,
                              status: e.target.value as OrderStatus,
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                          className="px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant/50 text-on-surface text-[12px] focus:outline-none focus:border-primary/60 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          id={`expand-order-${order.id}`}
                          onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                          title={expandedId === order.id ? "Collapse" : "View items"}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {expandedId === order.id ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                      </td>
                    </tr>

                    {/* Expanded items row */}
                    {expandedId === order.id && (
                      <tr key={`${order.id}-items`} className="bg-surface-container/10">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="text-[13px] text-on-surface-variant font-semibold mb-2">
                            Order Items
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-[13px]">
                                <span className="text-on-surface">
                                  {item.name_snapshot} × {item.quantity}
                                </span>
                                <span className="text-on-surface-variant font-medium">
                                  ₹{(Number(item.price_snapshot) * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant text-[14px]">
                      <span className="material-symbols-outlined text-[40px] block mb-2 opacity-40">receipt_long</span>
                      No orders found
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
