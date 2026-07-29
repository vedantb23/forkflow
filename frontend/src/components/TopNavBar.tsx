"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/store/authStore";
import { useRouter, usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

// Nav links shown per role. Public visitors and customers get the discovery-
// focused set; owners/delivery/admin get a shortcut to their workspace.
const NAV_BY_ROLE: Record<Role | "GUEST", { label: string; href: string }[]> = {
  GUEST: [
    { label: "Browse", href: "/" },
    { label: "AI Assistant", href: "/search" }
  ],
  CUSTOMER: [
    { label: "Browse", href: "/" },
    { label: "AI Assistant", href: "/search" },
    { label: "My Orders", href: "/orders" },
    { label: "Cart", href: "/cart" },
  ],
  RESTAURANT_OWNER: [
    { label: "Browse", href: "/" },
    { label: "Dashboard", href: "/dashboard/restaurant" },
  ],
  DELIVERY: [
    { label: "Browse", href: "/" },
    { label: "Deliveries", href: "/dashboard/delivery" },
  ],
  ADMIN: [
    { label: "Browse", href: "/" },
    { label: "Admin", href: "/admin" },
  ],
};

export function TopNavBar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Before mount we don't know the persisted user, so render the guest set to
  // avoid a hydration mismatch, then swap to the role-specific links.
  const navLinks = mounted && user ? NAV_BY_ROLE[user.role] : NAV_BY_ROLE.GUEST;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-white/70 dark:bg-surface-dim/70 backdrop-blur-md shadow-sm transition-colors duration-300">
      <div className="flex justify-between items-center px-[20px] md:px-[48px] h-16 w-full max-w-[1440px] mx-auto">
        <Link href="/" className="font-headline-md text-[24px] font-bold text-primary dark:text-primary-fixed-dim tracking-tight">
          ForkFlow
        </Link>
        <nav className="hidden md:flex items-center gap-[24px] font-body-md text-[16px]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "text-primary font-bold border-b-2 border-primary pb-1"
                    : "text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary transition-colors hover:bg-primary-container/10 duration-200 px-[16px] py-[8px] rounded-md"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-[16px]">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle Dark Mode"
              className="p-[8px] rounded-full hover:bg-primary-container/10 transition-all duration-200 scale-95 active:scale-90 text-on-surface-variant dark:text-on-secondary-fixed-variant"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
            </button>
          )}
          {mounted && user ? (
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-[14px] text-on-surface font-bold">Hi, {user.name.split(" ")[0]}</span>
              <button onClick={handleLogout} className="p-[8px] rounded-full hover:bg-error-container/20 text-error transition-all duration-200 scale-95 active:scale-90" aria-label="Log out">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
              </button>
            </div>
          ) : (
            <Link href="/login" aria-label="Account">
              <button className="p-[8px] rounded-full hover:bg-primary-container/10 transition-all duration-200 scale-95 active:scale-90 text-on-surface-variant dark:text-on-secondary-fixed-variant">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>account_circle</span>
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
