"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import { DELIVERY_STATUSES } from "@/lib/types";

export default function DeliveryDashboardPage() {
  const { user } = useAuth();
  const [orderId, setOrderId] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);

  // Update the delivery status for the entered order. The backend mirrors this
  // onto the order (PICKED_UP → OUT_FOR_DELIVERY, DELIVERED → DELIVERED) and emits
  // the change to the customer's order room.
  async function updateStatus(status: string) {
    setError("");
    setMsg("");
    try {
      await apiPatch(`/delivery/${orderId}/status`, { status });
      setMsg(`Status set to ${status}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to update status");
    }
  }

  // Push one GPS reading from the browser's geolocation to the backend, which
  // broadcasts it to the customer watching the order live.
  async function sendLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setSharing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await apiPatch(`/delivery/${orderId}/location`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setMsg("Location sent");
        } catch (err: any) {
          setError(err?.response?.data?.message ?? "Failed to send location");
        } finally {
          setSharing(false);
        }
      },
      () => {
        setError("Could not read your location");
        setSharing(false);
      }
    );
  }

  if (!user) return <p className="p-8 text-zinc-500">Log in as a delivery partner.</p>;

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-1 text-2xl font-semibold">Delivery partner</h1>
      <p className="mb-6 text-sm text-zinc-500">Update status and share your location.</p>

      <label className="mb-1 block text-sm font-medium">Order ID</label>
      <input
        value={orderId}
        onChange={(e) => setOrderId(e.target.value.trim())}
        placeholder="paste the order id"
        className="mb-4 w-full rounded border px-3 py-2"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {DELIVERY_STATUSES.filter((s) => s !== "UNASSIGNED").map((s) => (
          <button
            key={s}
            onClick={() => updateStatus(s)}
            disabled={!orderId}
            className="rounded bg-neutral-900 px-3 py-1 text-sm text-white disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      <button
        onClick={sendLocation}
        disabled={!orderId || sharing}
        className="w-full rounded-lg border border-neutral-900 py-2 text-sm font-medium disabled:opacity-40"
      >
        {sharing ? "Getting location…" : "Send current location"}
      </button>

      {msg && <p className="mt-4 text-sm text-green-600">{msg}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
