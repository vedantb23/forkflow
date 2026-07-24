"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import type { User } from "@/lib/types";

// Login page. Posts credentials to the backend, stores the returned {user, token}.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const setAuth = useAuth((s) => s.setAuth);
  const router = useRouter();

  // Submit handler: call /auth/login, save auth, go home. Show API error on fail.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiPost<{ user: User; token: string }>("/auth/login", { email, password });
      setAuth(data.user, data.token);
      router.push("/");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Login failed");
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-neutral-900 py-2 text-white">Log in</button>
      </form>
      <p className="text-sm">
        No account?{" "}
        <Link href="/register" className="underline">
          Register
        </Link>
      </p>
    </div>
  );
}
