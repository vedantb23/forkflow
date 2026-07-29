"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import type { User } from "@/lib/types";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function Register() {
  const [role, setRole] = useState("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const setAuth = useAuth((state) => state.setAuth);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ user: User; token: string }>("/auth/register", {
        name,
        email,
        password,
        role,
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
      setError(err.response?.data?.message || "Registration failed");
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
            Elevate Your<br />Culinary Journey.
          </h2>
          <p className="font-body-lg text-[18px] opacity-90 max-w-md">
            Join ForkFlow's premium concierge network and experience food delivery redefined.
          </p>
        </div>
        {/* Subtle Brand Element overlay */}
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
      <div className="flex-1 w-full flex flex-col justify-center items-center px-[20px] md:px-[48px] py-[64px] relative overflow-hidden bg-surface">
        {/* Decorative subtle background blob */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/3 animate-fade-in delay-300"></div>
        
        <div className="w-full min-w-0 z-10 mx-auto">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex justify-center items-center gap-[8px] mb-[40px] animate-fade-up">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant
            </span>
            <span className="font-headline-lg-mobile text-[28px] font-bold text-primary">ForkFlow</span>
          </div>

          <div className="mb-[40px] text-center animate-fade-up delay-100">
            <h1 className="font-headline-lg text-[32px] mb-[8px] text-on-surface font-bold">Create an Account</h1>
            <p className="font-body-md text-[16px] text-on-surface-variant">Choose your role to get started with ForkFlow.</p>
          </div>

          {/* Role Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] mb-[32px] animate-fade-up delay-200">
            {/* Customer Role */}
            <button
              onClick={() => setRole("CUSTOMER")}
              className={`flex flex-col items-center p-[12px] rounded-xl shadow-sm text-center border transition-all duration-300 active:scale-95 ${
                role === "CUSTOMER" ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-surface-container-lowest border-outline-variant/30 hover:shadow-md"
              }`}
              type="button"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-[8px] transition-colors ${
                  role === "CUSTOMER" ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <span className={`font-label-md text-[14px] ${role === "CUSTOMER" ? "text-primary font-bold" : "text-on-surface"}`}>Customer</span>
            </button>

            {/* Restaurant Owner Role */}
            <button
              onClick={() => setRole("RESTAURANT_OWNER")}
              className={`flex flex-col items-center p-[12px] rounded-xl shadow-sm text-center border transition-all duration-300 active:scale-95 ${
                role === "RESTAURANT_OWNER" ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-surface-container-lowest border-outline-variant/30 hover:shadow-md"
              }`}
              type="button"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-[8px] transition-colors ${
                  role === "RESTAURANT_OWNER" ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">storefront</span>
              </div>
              <span className={`font-label-md text-[14px] ${role === "RESTAURANT_OWNER" ? "text-primary font-bold" : "text-on-surface"}`}>Restaurant</span>
            </button>

            {/* Delivery Partner Role */}
            <button
              onClick={() => setRole("DELIVERY")}
              className={`flex flex-col items-center p-[12px] rounded-xl shadow-sm text-center border transition-all duration-300 active:scale-95 ${
                role === "DELIVERY" ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-surface-container-lowest border-outline-variant/30 hover:shadow-md"
              }`}
              type="button"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-[8px] transition-colors ${
                  role === "DELIVERY" ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">two_wheeler</span>
              </div>
              <span className={`font-label-md text-[14px] ${role === "DELIVERY" ? "text-primary font-bold" : "text-on-surface"}`}>Delivery</span>
            </button>
          </div>

          {/* Form */}
          <form className="space-y-[24px] animate-fade-up delay-300 bg-surface-container p-[32px] rounded-2xl shadow-lg border border-outline-variant/50" onSubmit={handleRegister}>
            {error && (
              <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm text-center font-bold">
                {error}
              </div>
            )}
            <div className="space-y-[20px]">
              <div>
                <label className="block font-label-md text-[14px] text-on-surface mb-[8px] font-semibold" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 font-body-md text-[16px] text-on-surface transition-all outline-none"
                  id="fullName"
                  placeholder="Jane Doe"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
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
                <span>{loading ? "Creating Account..." : "Create Account"}</span>
                {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </button>
            </div>

            {/* Divider between the form and Google sign-up */}
            <div className="flex items-center gap-[12px]">
              <div className="flex-1 h-px bg-outline-variant"></div>
              <span className="font-label-sm text-[12px] text-on-surface-variant/70">OR</span>
              <div className="flex-1 h-px bg-outline-variant"></div>
            </div>

            {/* Google Sign-Up. NOTE: Google accounts are always created as
                CUSTOMER (the role picker above only applies to email sign-up),
                because we can't collect a role during Google's own popup. */}
            <GoogleSignInButton onError={setError} />
            <p className="text-center font-label-sm text-[11px] text-on-surface-variant/60">
              Signing up with Google creates a Customer account.
            </p>

            <div className="text-center mt-[24px]">
              <p className="font-body-md text-[14px] text-on-surface-variant">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-bold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>

            <div className="text-center mt-[32px]">
              <p className="font-label-sm text-[12px] text-on-surface-variant/70">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
