"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { api } from "@/lib/api";

const links = [
  { icon: "skillet", label: "Live Orders", href: "/dashboard/restaurant" },
  { icon: "menu_book", label: "Menu Manager", href: "/dashboard/restaurant/menu" },
];

export default function CreateRestaurantPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("name", name);
      if (description) form.append("description", description);
      if (address) form.append("address", address);
      if (image) form.append("image", image);
      await api.post("/restaurants", form);
      router.push("/dashboard/restaurant");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <DashboardSidebar title="Restaurant" subtitle="Setup" links={links} userType="restaurant" />
        <main className="flex-1 md:ml-64 p-[24px] md:p-[48px] overflow-y-auto">
          <div className="max-w-[600px] mx-auto">
            <div className="mb-[32px]">
              <Link href="/dashboard/restaurant" className="text-on-surface-variant hover:text-primary font-label-md text-[14px] flex items-center gap-[4px] mb-[16px]">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
              </Link>
              <h1 className="font-headline-md text-[32px] font-bold text-on-surface">Create Restaurant</h1>
              <p className="font-body-md text-[16px] text-on-surface-variant">Set up your restaurant to start receiving orders.</p>
            </div>

            <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-[32px] border border-outline-variant/30 space-y-[24px]">
              {error && (
                <div className="bg-error-container text-on-error-container p-[12px] rounded-lg font-label-md text-[14px]">{error}</div>
              )}

              <div>
                <label className="block font-label-md text-[14px] text-on-surface mb-[8px] font-semibold">Restaurant Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Luigi's Pizza"
                  className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-label-md text-[14px] text-on-surface mb-[8px] font-semibold">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What kind of food do you serve?"
                  rows={3}
                  className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block font-label-md text-[14px] text-on-surface mb-[8px] font-semibold">Address</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City"
                  className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-label-md text-[14px] text-on-surface mb-[8px] font-semibold">Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 font-body-md text-[14px] text-on-surface-variant file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:font-label-md file:text-[12px] file:bg-primary-container file:text-on-primary-container cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-primary to-surface-tint text-on-primary rounded-xl font-label-md text-[16px] font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-[8px]"
              >
                {loading ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /><span>Creating...</span></>
                ) : (
                  <><span className="material-symbols-outlined text-[20px]">storefront</span><span>Create Restaurant</span></>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
