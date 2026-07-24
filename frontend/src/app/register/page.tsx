"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import type { User } from "@/lib/types";

// Register page. Same flow as login but hits /auth/register (creates the user,
// backend returns a token immediately so we log them straight in).
export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const setAuth = useAuth((s) => s.setAuth);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiPost<{ user: User; token: string }>("/auth/register", form);
      setAuth(data.user, data.token);
      router.push("/");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Registration failed");
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-neutral-900 py-2 text-white">Register</button>
      </form>
      <p className="text-sm">
        Have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
