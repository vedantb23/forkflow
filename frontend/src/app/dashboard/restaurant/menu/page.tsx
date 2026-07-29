"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { apiGet, apiDelete, api } from "@/lib/api";
import type { Restaurant, MenuItem } from "@/lib/types";

const links = [
  { icon: "skillet", label: "Live Orders", href: "/dashboard/restaurant" },
  { icon: "menu_book", label: "Menu Manager", href: "/dashboard/restaurant/menu" },
];

type FormState = { name: string; description: string; price: string; is_available: boolean; is_veg: boolean; spice_level: number; stock: string; prep_time_minutes: string; image: File | null };
const emptyForm = (): FormState => ({ name: "", description: "", price: "", is_available: true, is_veg: true, spice_level: 0, stock: "0", prep_time_minutes: "15", image: null });

export default function MenuManagerPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState("");

  const { data: myRestaurant } = useQuery({
    queryKey: ["my-restaurant"],
    queryFn: () => apiGet<{ restaurants: Restaurant[] }>("/restaurants/mine").then((d) => d.restaurants[0] ?? null),
  });
  const restaurantId = myRestaurant?.id;

  const { data: items, isLoading } = useQuery({
    queryKey: ["menu-owner", restaurantId],
    queryFn: () => apiGet<{ items: MenuItem[] }>(`/menu/${restaurantId}/owner`).then((d) => d.items),
    enabled: !!restaurantId,
  });

  function buildForm(f: FormState) {
    const fd = new FormData();
    fd.append("name", f.name);
    if (f.description) fd.append("description", f.description);
    fd.append("price", f.price);
    fd.append("is_available", String(f.is_available));
    fd.append("is_veg", String(f.is_veg));
    fd.append("spice_level", String(f.spice_level));
    fd.append("stock", f.stock);
    fd.append("prep_time_minutes", f.prep_time_minutes);
    if (f.image) fd.append("image", f.image);
    return fd;
  }

  const createItem = useMutation({
    mutationFn: (f: FormState) => api.post(`/menu/${restaurantId}`, buildForm(f)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu-owner", restaurantId] }); setAdding(false); setForm(emptyForm()); setError(""); },
    onError: (e: any) => setError(e?.response?.data?.message ?? "Failed to create item"),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, f }: { id: string; f: FormState }) => api.patch(`/menu/items/${id}`, buildForm(f)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu-owner", restaurantId] }); setEditing(null); setForm(emptyForm()); setError(""); },
    onError: (e: any) => setError(e?.response?.data?.message ?? "Failed to update item"),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => apiDelete(`/menu/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-owner", restaurantId] }),
  });

  function openAdd() { setForm(emptyForm()); setError(""); setAdding(true); setEditing(null); }
  function openEdit(item: MenuItem) {
    setForm({ name: item.name, description: item.description ?? "", price: item.price, is_available: item.is_available, is_veg: item.is_veg, spice_level: item.spice_level, stock: String(item.stock), prep_time_minutes: String(item.prep_time_minutes), image: null });
    setError(""); setEditing(item); setAdding(false);
  }
  function closePanel() { setAdding(false); setEditing(null); setError(""); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) updateItem.mutate({ id: editing.id, f: form });
    else createItem.mutate(form);
  }

  const panelOpen = adding || !!editing;
  const saving = createItem.isPending || updateItem.isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <DashboardSidebar title="Menu Manager" subtitle={myRestaurant?.name ?? "Restaurant"} links={links} userType="restaurant" />

        <main className="flex-1 md:ml-64 p-[24px] md:p-[48px] overflow-y-auto">
          <div className="flex justify-between items-center mb-[32px]">
            <div>
              <Link href="/dashboard/restaurant" className="text-on-surface-variant hover:text-primary font-label-md text-[14px] flex items-center gap-[4px] mb-[8px]">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Live Orders
              </Link>
              <h1 className="font-headline-md text-[32px] font-bold text-on-surface">Menu Manager</h1>
              <p className="font-body-md text-[16px] text-on-surface-variant">{myRestaurant?.name}</p>
            </div>
            <button onClick={openAdd} className="flex items-center gap-[8px] bg-primary text-on-primary px-[24px] py-[12px] rounded-xl font-label-md text-[14px] font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-md">
              <span className="material-symbols-outlined text-[20px]">add</span> Add Dish
            </button>
          </div>

          {!restaurantId ? (
            <div className="glass-card rounded-2xl p-[48px] text-center border border-outline-variant/30">
              <p className="font-body-md text-[16px] text-on-surface-variant mb-[24px]">No restaurant found.</p>
              <Link href="/dashboard/restaurant/create" className="text-primary font-bold hover:underline">Create your restaurant first</Link>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-[64px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[16px]">
              {items?.map((item) => (
                <div key={item.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-[16px] flex flex-col gap-[12px] shadow-sm hover:shadow-md transition-shadow">
                  {item.image_url && (
                    <div className="h-[140px] rounded-lg overflow-hidden bg-surface-container">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-label-md text-[16px] font-bold text-on-surface truncate">{item.name}</h3>
                      {item.description && <p className="font-body-md text-[13px] text-on-surface-variant line-clamp-2 mt-[2px]">{item.description}</p>}
                    </div>
                    <span className="font-headline-md text-[18px] text-primary ml-[8px] shrink-0">₹{Number(item.price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-[8px] border-t border-outline-variant/20">
                    <div className="flex items-center gap-[6px] flex-wrap">
                      <span className={`font-label-md text-[12px] px-[8px] py-[2px] rounded-full ${item.is_available ? "bg-tertiary-container/40 text-on-tertiary-container" : "bg-error-container text-on-error-container"}`}>
                        {item.is_available ? "Available" : "Unavailable"}
                      </span>
                      <span className={`font-label-md text-[12px] px-[8px] py-[2px] rounded-full ${item.is_veg ? "bg-tertiary-container/40 text-on-tertiary-container" : "bg-error-container/30 text-on-error-container"}`}>
                        {item.is_veg ? "Veg" : "Non-veg"}
                      </span>
                      {item.spice_level > 0 && (
                        <span className="font-label-md text-[12px] px-[8px] py-[2px] rounded-full bg-surface-container text-on-surface-variant">
                          {"🌶️".repeat(item.spice_level)}
                        </span>
                      )}
                      <span className="font-label-md text-[12px] text-on-surface-variant">Stock: {item.stock}</span>
                    </div>
                    <div className="flex gap-[8px]">
                      <button onClick={() => openEdit(item)} className="p-[6px] rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => { if (confirm("Delete this item?")) deleteItem.mutate(item.id); }} className="p-[6px] rounded-lg hover:bg-error-container/30 text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {items?.length === 0 && (
                <div className="col-span-full glass-card rounded-2xl p-[48px] text-center border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[48px] text-surface-container-high mb-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                  <p className="font-body-md text-[16px] text-on-surface-variant">No dishes yet. Add your first dish!</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Side panel for add/edit */}
        {panelOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={closePanel} />
            <div className="relative w-full max-w-[440px] bg-surface h-full overflow-y-auto shadow-2xl p-[32px] flex flex-col">
              <div className="flex justify-between items-center mb-[24px]">
                <h2 className="font-headline-md text-[24px] font-bold text-on-surface">{editing ? "Edit Dish" : "Add Dish"}</h2>
                <button onClick={closePanel} className="p-[8px] rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-[20px] flex-1">
                {error && <div className="bg-error-container text-on-error-container p-[12px] rounded-lg font-label-md text-[14px]">{error}</div>}

                <div>
                  <label className="block font-label-md text-[14px] text-on-surface mb-[6px] font-semibold">Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Margherita Pizza" className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface outline-none transition-all" />
                </div>

                <div>
                  <label className="block font-label-md text-[14px] text-on-surface mb-[6px] font-semibold">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the dish..." className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface outline-none transition-all resize-none" />
                </div>

                <div>
                  <label className="block font-label-md text-[14px] text-on-surface mb-[6px] font-semibold">Price (₹) *</label>
                  <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="12.99" className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface outline-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <label className="block font-label-md text-[14px] text-on-surface mb-[6px] font-semibold">Stock *</label>
                    <input required type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block font-label-md text-[14px] text-on-surface mb-[6px] font-semibold">Prep (min)</label>
                    <input type="number" min="0" step="1" value={form.prep_time_minutes} onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })} placeholder="15" className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-[14px] text-on-surface mb-[6px] font-semibold">Spice Level</label>
                  <div className="flex gap-[8px]">
                    {[
                      { v: 0, label: "None" },
                      { v: 1, label: "Mild" },
                      { v: 2, label: "Medium" },
                      { v: 3, label: "Hot" },
                    ].map((s) => (
                      <button
                        key={s.v}
                        type="button"
                        onClick={() => setForm({ ...form, spice_level: s.v })}
                        className={`flex-1 py-2 rounded-lg font-label-md text-[13px] border transition-all ${form.spice_level === s.v ? "bg-primary text-on-primary border-primary" : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/50"}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-[12px]">
                  <button type="button" onClick={() => setForm({ ...form, is_veg: !form.is_veg })} className={`relative w-[48px] h-[26px] rounded-full transition-colors duration-300 ${form.is_veg ? "bg-tertiary" : "bg-surface-container-high border border-outline-variant"}`}>
                    <div className={`absolute top-[3px] left-[3px] w-[20px] h-[20px] rounded-full bg-white transition-transform duration-300 shadow-sm ${form.is_veg ? "translate-x-[22px]" : "translate-x-0"}`} />
                  </button>
                  <span className="font-label-md text-[14px] text-on-surface">{form.is_veg ? "Vegetarian" : "Non-veg"}</span>
                </div>

                <div>
                  <label className="block font-label-md text-[14px] text-on-surface mb-[6px] font-semibold">Image</label>
                  <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] ?? null })} className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 font-body-md text-[14px] text-on-surface-variant file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:font-label-md file:text-[12px] file:bg-primary-container file:text-on-primary-container cursor-pointer" />
                </div>

                <div className="flex items-center gap-[12px]">
                  <button type="button" onClick={() => setForm({ ...form, is_available: !form.is_available })} className={`relative w-[48px] h-[26px] rounded-full transition-colors duration-300 ${form.is_available ? "bg-primary" : "bg-surface-container-high border border-outline-variant"}`}>
                    <div className={`absolute top-[3px] left-[3px] w-[20px] h-[20px] rounded-full bg-white transition-transform duration-300 shadow-sm ${form.is_available ? "translate-x-[22px]" : "translate-x-0"}`} />
                  </button>
                  <span className="font-label-md text-[14px] text-on-surface">{form.is_available ? "Available" : "Unavailable"}</span>
                </div>

                <div className="flex gap-[12px] pt-[8px]">
                  <button type="button" onClick={closePanel} className="flex-1 h-12 bg-surface-container-high text-on-surface rounded-xl font-label-md text-[14px] hover:bg-surface-variant transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 h-12 bg-primary text-on-primary rounded-xl font-label-md text-[14px] font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-[8px]">
                    {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : null}
                    {editing ? "Save Changes" : "Add Dish"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
