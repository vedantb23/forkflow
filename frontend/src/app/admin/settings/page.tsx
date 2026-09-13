"use client";

import { useAuth } from "@/store/authStore";

export default function AdminSettingsPage() {
  const user = useAuth((state) => state.user);

  return (
    <>
      {/* Page Header */}
      <div className="mb-[32px]">
        <h1 className="font-headline-md text-[32px] font-bold text-on-surface mb-[4px]">Settings</h1>
        <p className="font-body-md text-[16px] text-on-surface-variant">
          Admin profile and system information.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Profile Card */}
        <div className="bg-surface-container-lowest dark:bg-surface-dim border border-white/40 shadow-[0_8px_32px_0_rgba(181,35,48,0.04)] rounded-xl p-6 backdrop-blur-md">
          <h2 className="font-title-md text-[18px] font-semibold text-on-surface mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">manage_accounts</span>
            Admin Profile
          </h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-[28px] font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </div>
            <div>
              <p className="text-[18px] font-bold text-on-surface">{user?.name ?? "—"}</p>
              <p className="text-[14px] text-on-surface-variant">{user?.email ?? "—"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
              <span className="text-[14px] text-on-surface-variant">Role</span>
              <span className="px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 font-label-sm text-[12px] font-semibold">
                {user?.role ?? "ADMIN"}
              </span>
            </div>
            {user?.phone && (
              <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                <span className="text-[14px] text-on-surface-variant">Phone</span>
                <span className="text-[14px] text-on-surface">{user.phone}</span>
              </div>
            )}
            {user?.created_at && (
              <div className="flex items-center justify-between py-3">
                <span className="text-[14px] text-on-surface-variant">Member Since</span>
                <span className="text-[14px] text-on-surface">
                  {new Date(user.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* System Info Card */}
        <div className="bg-surface-container-lowest dark:bg-surface-dim border border-white/40 shadow-[0_8px_32px_0_rgba(181,35,48,0.04)] rounded-xl p-6 backdrop-blur-md">
          <h2 className="font-title-md text-[18px] font-semibold text-on-surface mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">info</span>
            System Info
          </h2>

          <div className="space-y-3">
            {[
              { label: "App Name", value: "ForkFlow" },
              { label: "Version", value: "1.0.0" },
              { label: "Environment", value: process.env.NODE_ENV ?? "production" },
              { label: "API Base", value: process.env.NEXT_PUBLIC_API_URL ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-outline-variant/20 last:border-0">
                <span className="text-[14px] text-on-surface-variant">{label}</span>
                <span className="font-mono text-[13px] text-on-surface bg-surface-container px-2 py-0.5 rounded">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="bg-surface-container-lowest dark:bg-surface-dim border border-white/40 shadow-[0_8px_32px_0_rgba(181,35,48,0.04)] rounded-xl p-6 backdrop-blur-md lg:col-span-2">
          <h2 className="font-title-md text-[18px] font-semibold text-on-surface mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">link</span>
            Quick Navigation
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "dashboard", label: "Overview", href: "/admin" },
              { icon: "group", label: "Users", href: "/admin/users" },
              { icon: "storefront", label: "Restaurants", href: "/admin/restaurants" },
              { icon: "receipt_long", label: "Orders", href: "/admin/orders" },
            ].map(({ icon, label, href }) => (
              <a
                key={href}
                id={`settings-nav-${label.toLowerCase()}`}
                href={href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors group"
              >
                <span className="material-symbols-outlined text-[28px] text-primary group-hover:scale-110 transition-transform">
                  {icon}
                </span>
                <span className="text-[13px] text-on-surface font-medium">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
