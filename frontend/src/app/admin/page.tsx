"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiGet } from "@/lib/api";
import type { Restaurant, User, Role } from "@/lib/types";

// ─── Color palette ───────────────────────────────────────────────────────────
const ROLE_COLORS: Record<Role, string> = {
  CUSTOMER: "#60a5fa",
  RESTAURANT_OWNER: "#fb923c",
  DELIVERY: "#34d399",
  ADMIN: "#f87171",
};

const STATUS_COLORS = { Open: "#34d399", Closed: "#6b7280" };

// ─── Animated SVG donut chart ─────────────────────────────────────────────────
function DonutChart({
  slices,
  size = 140,
  thickness = 28,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  let offset = 0;
  const arcs = slices.map((sl) => {
    const pct = sl.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const arc = { ...sl, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* background track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
      {arcs.map((arc, i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="round"
          style={{ transformOrigin: "center", rotate: "-90deg" }}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${arc.dash} ${arc.gap}` }}
          transition={{ duration: 1, delay: i * 0.12, ease: "easeOut" }}
        />
      ))}
      {/* center hole glow */}
      <circle cx={cx} cy={cx} r={r - thickness / 2 - 2} fill="rgba(255,255,255,0.02)" />
    </svg>
  );
}

// ─── Animated horizontal bar ──────────────────────────────────────────────────
function Bar({
  label,
  value,
  max,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  delay?: number;
}) {
  const pct = max === 0 ? 0 : (value / max) * 100;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-[12px] text-on-surface-variant w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay, ease: "easeOut" }}
        />
      </div>
      <span className="text-[12px] text-on-surface w-5 text-right shrink-0">{value}</span>
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {target.toLocaleString()}{suffix}
    </motion.span>
  );
}

// ─── Trend sparkline ──────────────────────────────────────────────────────────
function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const w = 120;
  const h = 40;
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
  const filled = `0,${h} ${coords} ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polygon
        points={filled}
        fill={`url(#sg-${color.replace("#", "")})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      <motion.polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon,
  iconClass,
  sub,
  sparkPoints,
  sparkColor,
}: {
  label: string;
  value: string | number | null;
  icon: string;
  iconClass: string;
  sub?: string;
  sparkPoints?: number[];
  sparkColor?: string;
}) {
  return (
    <motion.div
      className="bg-surface-container-lowest dark:bg-surface-dim border border-white/10 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.015, transition: { duration: 0.15 } }}
    >
      {/* gradient shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex justify-between items-start mb-3 relative z-10">
        <span className="font-label-md text-[13px] text-on-surface-variant tracking-wide uppercase">{label}</span>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconClass} bg-white/5`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between">
        <div>
          <span className="font-headline-md text-[32px] font-bold text-on-surface block leading-none">
            {value != null ? <Counter target={Number(value)} /> : "—"}
          </span>
          {sub && <span className="font-body-sm text-[12px] text-on-surface-variant mt-1 block">{sub}</span>}
        </div>
        {sparkPoints && sparkColor && (
          <div className="opacity-70">
            <Sparkline points={sparkPoints} color={sparkColor} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <motion.div
      className="bg-surface-container-lowest dark:bg-surface-dim border border-white/10 rounded-2xl p-6 backdrop-blur-md overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        <h3 className="font-title-md text-[16px] font-semibold text-on-surface">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Legend dot ───────────────────────────────────────────────────────────────
function Legend({ items }: { items: { label: string; value: number; color: string }[] }) {
  return (
    <div className="flex flex-col gap-2 mt-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[12px] text-on-surface-variant">{item.label.replace("_", " ")}</span>
          </div>
          <span className="text-[12px] font-semibold text-on-surface">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiGet<{ users: User[]; count: number }>("/users"),
    retry: false,
  });

  const { data: restaurants, isLoading: loadingRestaurants } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () =>
      apiGet<{ restaurants: Restaurant[] }>("/restaurants").then((d) => d.restaurants),
  });

  const users = usersData?.users ?? [];

  // ── derive role distribution
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});
  const roleSlices = (Object.entries(roleCounts) as [Role, number][]).map(([role, count]) => ({
    label: role,
    value: count,
    color: ROLE_COLORS[role],
  }));

  // ── derive restaurant status
  const openCount = restaurants?.filter((r) => r.is_open).length ?? 0;
  const closedCount = (restaurants?.length ?? 0) - openCount;
  const statusSlices = [
    { label: "Open", value: openCount, color: STATUS_COLORS.Open },
    { label: "Closed", value: closedCount, color: STATUS_COLORS.Closed },
  ].filter((s) => s.value > 0);

  // ── derive cuisine breakdown
  const cuisineCounts = (restaurants ?? []).reduce<Record<string, number>>((acc, r) => {
    const c = r.cuisine ?? "Other";
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  const cuisineEntries = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxCuisine = cuisineEntries[0]?.[1] ?? 1;

  // ── derive users joined per day (last 7 days)
  const now = Date.now();
  const DAY = 86400000;
  const joinTrend = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * DAY;
    const dayEnd = dayStart + DAY;
    return users.filter((u) => {
      const t = u.created_at ? new Date(u.created_at).getTime() : 0;
      return t >= dayStart && t < dayEnd;
    }).length;
  });

  const isLoading = loadingUsers || loadingRestaurants;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Page header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-headline-md text-[32px] font-bold text-on-surface mb-1">
          Admin Overview
        </h1>
        <p className="font-body-md text-[15px] text-on-surface-variant">
          Live metrics and system analytics.
        </p>
      </motion.div>

      {/* ── KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Users"
          value={usersData?.count ?? 0}
          icon="group"
          iconClass="text-blue-400"
          sub={`${joinTrend.reduce((a, b) => a + b, 0)} this week`}
          sparkPoints={joinTrend}
          sparkColor="#60a5fa"
        />
        <KpiCard
          label="Restaurants"
          value={restaurants?.length ?? 0}
          icon="storefront"
          iconClass="text-primary"
          sub={`${openCount} open now`}
          sparkPoints={Array.from({ length: 7 }, (_, i) => Math.max(0, (restaurants?.length ?? 0) - i * 2))}
          sparkColor="#f87171"
        />
        <KpiCard
          label="Open Restaurants"
          value={openCount}
          icon="check_circle"
          iconClass="text-green-400"
          sub={
            (restaurants?.length ?? 0) > 0
              ? `${Math.round((openCount / (restaurants?.length ?? 1)) * 100)}% availability`
              : undefined
          }
        />
        <KpiCard
          label="Cuisines"
          value={Object.keys(cuisineCounts).length}
          icon="restaurant_menu"
          iconClass="text-orange-400"
          sub="unique types"
        />
      </div>

      {/* ── Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Role Distribution donut */}
        <ChartCard title="User Role Distribution" icon="pie_chart">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <DonutChart slices={roleSlices} size={140} thickness={26} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[22px] font-bold text-on-surface leading-none">
                  {usersData?.count ?? 0}
                </span>
                <span className="text-[10px] text-on-surface-variant">users</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Legend items={roleSlices} />
            </div>
          </div>
        </ChartCard>

        {/* Restaurant Status donut */}
        <ChartCard title="Restaurant Status" icon="storefront">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <DonutChart slices={statusSlices} size={140} thickness={26} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[22px] font-bold text-on-surface leading-none">
                  {restaurants?.length ?? 0}
                </span>
                <span className="text-[10px] text-on-surface-variant">total</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Legend items={statusSlices} />
              {(restaurants?.length ?? 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-outline-variant/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-on-surface-variant">Availability</span>
                    <span className="text-[11px] font-semibold text-green-400">
                      {Math.round((openCount / (restaurants?.length ?? 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-green-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((openCount / (restaurants?.length ?? 1)) * 100)}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ChartCard>

        {/* Weekly signups sparkline card */}
        <ChartCard title="New Signups (7d)" icon="trending_up">
          <div>
            <div className="flex items-end gap-1 h-24 mb-3">
              {joinTrend.map((count, i) => {
                const maxVal = Math.max(...joinTrend, 1);
                const heightPct = (count / maxVal) * 100;
                const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const dayIdx = (new Date().getDay() - (6 - i) + 7) % 7;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group/bar">
                    <motion.div
                      className="w-full rounded-t-md relative overflow-hidden"
                      style={{
                        background: `linear-gradient(180deg, #60a5fa 0%, rgba(96,165,250,0.4) 100%)`,
                        minHeight: count > 0 ? 4 : 2,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(heightPct, count > 0 ? 8 : 4)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.07, ease: "easeOut" }}
                    >
                      {/* tooltip */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface-container-high text-on-surface text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {count}
                      </div>
                    </motion.div>
                    <span className="text-[9px] text-on-surface-variant">{days[dayIdx]}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
              <span className="text-[12px] text-on-surface-variant">Total this week</span>
              <span className="text-[14px] font-bold text-blue-400">
                +{joinTrend.reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Cuisine breakdown */}
        <ChartCard title="Top Cuisines" icon="restaurant_menu">
          {cuisineEntries.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant py-4 text-center">No cuisine data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {cuisineEntries.map(([cuisine, count], i) => (
                <Bar
                  key={cuisine}
                  label={cuisine}
                  value={count}
                  max={maxCuisine}
                  color={`hsl(${(i * 47) % 360}, 70%, 65%)`}
                  delay={i * 0.08}
                />
              ))}
            </div>
          )}
        </ChartCard>

        {/* Recent Users table (improved) */}
        <ChartCard title="Recent Signups" icon="person_add">
          <div className="flex flex-col gap-0">
            {users.slice(0, 6).map((u, i) => (
              <motion.div
                key={u.id}
                className="flex items-center gap-3 py-2.5 border-b border-outline-variant/10 last:border-0"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                {/* Avatar */}
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0"
                  style={{
                    backgroundColor: `${ROLE_COLORS[u.role]}22`,
                    color: ROLE_COLORS[u.role],
                  }}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-on-surface truncate">{u.name}</p>
                  <p className="text-[11px] text-on-surface-variant truncate">{u.email}</p>
                </div>

                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                  style={{
                    backgroundColor: `${ROLE_COLORS[u.role]}22`,
                    color: ROLE_COLORS[u.role],
                  }}
                >
                  {u.role.replace("_", " ")}
                </span>
              </motion.div>
            ))}
            {users.length === 0 && (
              <p className="text-[13px] text-on-surface-variant py-4 text-center">No users yet</p>
            )}
          </div>
        </ChartCard>
      </div>
    </>
  );
}
