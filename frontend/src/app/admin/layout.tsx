"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar, type SidebarLink } from "@/components/DashboardSidebar";
import { useAuth } from "@/store/authStore";

const ADMIN_LINKS: SidebarLink[] = [
  { icon: "dashboard", label: "Overview", href: "/admin" },
  { icon: "group", label: "Users", href: "/admin/users" },
  { icon: "storefront", label: "Restaurants", href: "/admin/restaurants" },
  { icon: "receipt_long", label: "Orders", href: "/admin/orders" },
  { icon: "settings", label: "Settings", href: "/admin/settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "ADMIN") {
      router.replace("/");
    } else {
      setIsAuthorized(true);
    }
  }, [user, router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar
        title="Management"
        subtitle="ForkFlow Dashboard"
        links={ADMIN_LINKS}
      />
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen w-full">
        <div className="pt-[40px] px-[24px] md:px-[48px] pb-[48px] flex-1 w-full max-w-[1280px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
