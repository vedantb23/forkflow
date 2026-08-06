"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/store/authStore";

export interface SidebarLink {
  icon: string;
  label: string;
  href: string;
}

interface DashboardSidebarProps {
  title: string;
  subtitle: string;
  links: SidebarLink[];
  userImage?: string;
  userType?: string;
}

export function DashboardSidebar({ title, subtitle, links, userImage, userType }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    router.push("/login");
  };

  return (
    <aside className="h-full w-64 fixed left-0 top-0 z-40 bg-surface dark:bg-surface-container-lowest shadow-md flex-col py-[24px] hidden md:flex border-r border-outline-variant/30 transition-colors duration-300">
      <div className="px-[48px] mb-[40px]">
        <Link href="/" className="font-headline-md text-[24px] font-bold text-primary">
          ForkFlow
        </Link>
        {userImage ? (
          <div className="mt-[40px] flex items-center gap-[16px]">
            <img src={userImage} alt="User Logo" className="w-12 h-12 rounded-full object-cover border border-outline-variant/30" />
            <div className="truncate">
              <div className="font-label-md text-[14px] text-on-surface truncate">{user?.name || title}</div>
              <div className="font-label-sm text-[12px] text-on-surface-variant truncate">{subtitle}</div>
            </div>
          </div>
        ) : (
          <div className="mt-[40px]">
            <div className="font-label-md text-[14px] text-on-surface truncate">{user?.name || title}</div>
            <p className="font-label-sm text-[12px] text-on-surface-variant mt-1">{subtitle}</p>
          </div>
        )}

      </div>

      <nav className="flex-1 px-[16px] space-y-[8px] overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`rounded-lg mx-2 my-1 px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-all font-label-md text-[14px] ${
                isActive
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-[48px] pt-[24px] border-t border-surface-container-low flex flex-col gap-2">
        {mounted && (
          <button
             onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
             className="text-on-surface-variant hover:bg-surface-container-high rounded-lg -mx-2 px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-all font-label-md text-[14px] w-[calc(100%+16px)] text-left"
          >
            <span className="material-symbols-outlined">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
            Toggle Theme
          </button>
        )}
        <button onClick={handleLogout} className="text-on-surface-variant hover:bg-error-container/20 hover:text-error rounded-lg -mx-2 px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-all font-label-md text-[14px] w-[calc(100%+16px)] text-left">
          <span className="material-symbols-outlined">logout</span>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
