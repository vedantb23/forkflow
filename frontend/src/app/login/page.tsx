"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import type { User } from "@/lib/types";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const setAuth = useAuth((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ user: User; token: string }>("/auth/login", {
        email,
        password,
      });
      setAuth(data.user, data.token);

      if (data.user.role === "CUSTOMER") {
        router.push("/");
      } else if (data.user.role === "RESTAURANT_OWNER") {
        router.push("/dashboard/restaurant");
      } else if (data.user.role === "DELIVERY") {
        router.push("/dashboard/delivery");
      } else if (data.user.role === "ADMIN") {
        router.push("/admin");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex antialiased">
      {/* Left Split: Hero Image — fixed 5/12 on desktop, never shrinks */}
      <div className="hidden lg:block lg:w-5/12 lg:shrink-0 relative animate-fade-in">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80")',
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-[48px] w-full text-on-primary">
          <h2 className="font-display-lg text-[48px] mb-[16px]">
            Welcome Back.
          </h2>
          <p className="font-body-lg text-[18px] opacity-90 max-w-md">
            Sign in to access your ForkFlow premium concierge services.
          </p>
        </div>
        <div className="absolute top-[48px] left-[48px]">
          <Link href="/">
            <div className="flex items-center gap-[8px] glass-panel px-[16px] py-[8px] rounded-full cursor-pointer hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                restaurant
              </span>
              <span className="font-label-md text-[14px] font-bold text-on-surface">ForkFlow</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Right Split: Auth Form — takes all remaining width (flex-1) so it can't collapse */}
      <div className="flex-1 w-full flex flex-col justify-center items-center p-[24px] md:p-[48px] relative bg-surface h-screen overflow-y-auto">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/3 animate-fade-in delay-300"></div>
        
        <div className="w-full min-w-0 z-10 mx-auto">
          <div className="lg:hidden flex justify-center items-center gap-[8px] mb-[40px] animate-fade-up">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant
            </span>
            <span className="font-headline-lg-mobile text-[28px] font-bold text-primary">ForkFlow</span>
          </div>

          <div className="mb-[40px] text-center animate-fade-up delay-100">
            <h1 className="font-headline-lg text-[32px] mb-[8px] text-on-surface font-bold">Sign In</h1>
            <p className="font-body-md text-[16px] text-on-surface-variant">Welcome back to your dashboard.</p>
          </div>

          <form className="space-y-[24px] animate-fade-up delay-300 bg-surface-container p-[32px] rounded-2xl shadow-lg border border-outline-variant/50" onSubmit={handleLogin}>
            {error && (
              <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm text-center font-bold">
                {error}
              </div>
            )}
            <div className="space-y-[20px]">
              <div>
                <label className="block font-label-md text-[14px] text-on-surface mb-[8px] font-semibold" htmlFor="email">
                  Email Address
                </label>
                <input
                  className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface transition-all outline-none"
                  id="email"
                  placeholder="jane@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-label-md text-[14px] text-on-surface mb-[8px] font-semibold" htmlFor="password">
                  Password
                </label>
                <input
                  className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface transition-all outline-none"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-[8px]">
              <button
                className="w-full h-14 bg-gradient-to-r from-primary to-surface-tint text-on-primary rounded-xl font-label-md text-[16px] font-bold shadow-md hover:shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 flex justify-center items-center gap-[8px] disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                <span>{loading ? "Signing In..." : "Sign In"}</span>
                {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </button>
            </div>

            {/* Divider between password login and Google sign-in */}
            <div className="flex items-center gap-[12px]">
              <div className="flex-1 h-px bg-outline-variant"></div>
              <span className="font-label-sm text-[12px] text-on-surface-variant/70">OR</span>
              <div className="flex-1 h-px bg-outline-variant"></div>
            </div>

            {/* Google Sign-In — reports failures into the same error banner above */}
            <GoogleSignInButton onError={setError} />

            <div className="text-center mt-[24px]">
              <p className="font-body-md text-[14px] text-on-surface-variant">
                Don't have an account?{" "}
                <Link href="/register" className="text-primary font-bold hover:underline">
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
