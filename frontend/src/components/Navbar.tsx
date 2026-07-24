"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/authStore";
import { useCart } from "@/store/cartStore";

// Top navigation. Shows cart count + login/logout depending on auth state.
export function Navbar() {
  const { user, logout } = useAuth();
  const lines = useCart((s) => s.lines);
  const router = useRouter();
  const cartCount = lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold">
          ForkFlow 🍴
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/orders">Orders</Link>
          {user?.role === "RESTAURANT_OWNER" || user?.role === "ADMIN" ? (
            <Link href="/dashboard">Dashboard</Link>
          ) : null}
          {user?.role === "DELIVERY" ? <Link href="/delivery">Delivery</Link> : null}
          <Link href="/cart">Cart{cartCount > 0 && ` (${cartCount})`}</Link>
          {user ? (
            <>
              <span className="text-neutral-500">{user.name}</span>
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="rounded bg-neutral-900 px-3 py-1 text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded bg-neutral-900 px-3 py-1 text-white">
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
