"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Restaurant, User } from "@/lib/types";

function KpiCard({
  label,
  value,
  icon,
  iconClass,
  trend,
  trendDir,
}: {
  label: string;
  value: string;
  icon: string;
  iconClass: string;
  trend?: string;
  trendDir?: "up" | "down";
}) {
  return (
    <div className="bg-surface-container-lowest dark:bg-surface-dim border border-white/40 shadow-[0_8px_32px_0_rgba(181,35,48,0.04)] rounded-xl p-[16px] flex flex-col justify-between backdrop-blur-md relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex justify-between items-start mb-[8px] relative z-10">
        <span className="font-label-md text-[14px] text-secondary">{label}</span>
        <span className={`material-symbols-outlined ${iconClass}`}>{icon}</span>
      </div>
      <div className="relative z-10">
        <span className="font-headline-md text-[24px] font-bold text-on-surface block">{value}</span>
        {trend && trendDir && (
          <div className={`flex items-center gap-[4px] mt-[4px] ${trendDir === "up" ? "text-tertiary-container" : "text-primary-container"}`}>
            <span className="material-symbols-outlined text-[16px]">
              {trendDir === "up" ? "trending_up" : "trending_down"}
            </span>
            <span className="font-label-md text-[12px]">{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiGet<{ users: User[]; count: number }>("/users"),
    retry: false,
  });

  const { data: restaurants, isLoading: loadingRestaurants } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => apiGet<{ restaurants: Restaurant[] }>("/restaurants").then((d) => d.restaurants),
  });

  const totalUsers = usersData?.count;
  const totalRestaurants = restaurants?.length;
  const usersList = usersData?.users || [];

  return (
    <>
      {/* Page header */}
      <div className="mb-[32px]">
        <h1 className="font-headline-md text-[32px] font-bold text-on-surface mb-[4px]">Admin Overview</h1>
        <p className="font-body-md text-[16px] text-on-surface-variant">System performance and daily metrics.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[16px] mb-[32px]">
        <KpiCard
          label="Total Users"
          value={totalUsers != null ? totalUsers.toLocaleString() : "—"}
          icon="group"
          iconClass="text-tertiary-fixed-dim"
        />
        <KpiCard
          label="Restaurants"
          value={totalRestaurants != null ? totalRestaurants.toLocaleString() : "—"}
          icon="storefront"
          iconClass="text-primary-fixed-dim"
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
        {/* Recent Users */}
        <div className="bg-surface-container-lowest dark:bg-surface-dim border border-white/40 shadow-[0_8px_32px_0_rgba(181,35,48,0.04)] rounded-xl p-[24px] backdrop-blur-md overflow-hidden flex flex-col">
          <h3 className="font-title-lg text-[24px] font-semibold text-on-surface mb-[16px]">Recent Users</h3>
          {loadingUsers ? (
            <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-secondary font-label-md text-[14px]">
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 pl-4 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.slice(0, 5).map((u) => (
                    <tr key={u.id} className="border-b border-outline-variant/10 hover:bg-surface-container/30 transition-colors">
                      <td className="py-3 pr-4 font-body-md text-[14px] text-on-surface">{u.name}</td>
                      <td className="py-3 px-4 font-body-md text-[14px] text-on-surface-variant truncate max-w-[150px]">{u.email}</td>
                      <td className="py-3 pl-4">
                        <span className="bg-surface-container-high text-on-surface px-2 py-1 rounded-md font-label-sm text-[12px]">
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-on-surface-variant text-[14px]">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Restaurants */}
        <div className="bg-surface-container-lowest dark:bg-surface-dim border border-white/40 shadow-[0_8px_32px_0_rgba(181,35,48,0.04)] rounded-xl p-[24px] backdrop-blur-md overflow-hidden flex flex-col">
          <h3 className="font-title-lg text-[24px] font-semibold text-on-surface mb-[16px]">Restaurants</h3>
          {loadingRestaurants ? (
            <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-secondary font-label-md text-[14px]">
                    <th className="py-3 pr-4 font-semibold">Restaurant Name</th>
                    <th className="py-3 pl-4 font-semibold">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants?.slice(0, 5).map((r) => (
                    <tr key={r.id} className="border-b border-outline-variant/10 hover:bg-surface-container/30 transition-colors">
                      <td className="py-3 pr-4 font-body-md text-[14px] text-on-surface font-semibold">{r.name}</td>
                      <td className="py-3 pl-4 font-body-md text-[14px] text-on-surface-variant truncate max-w-[200px]">{r.address}</td>
                    </tr>
                  ))}
                  {(!restaurants || restaurants.length === 0) && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-on-surface-variant text-[14px]">No restaurants found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
