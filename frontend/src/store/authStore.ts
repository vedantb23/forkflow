"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/types";
import { closeSocket } from "@/lib/socket";

interface AuthState {
  user: User | null;
  token: string | null;
  // Called after a successful login/register: store user + token (persisted).
  setAuth: (user: User, token: string) => void;
  // Clear everything and drop the socket so a re-login re-handshakes.
  logout: () => void;
}

// Zustand store persisted to localStorage so a refresh keeps you logged in.
// We also mirror the token into a plain localStorage key ("token") because the
// axios + socket layers read it directly there.
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem("token", token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem("token");
        closeSocket();
        set({ user: null, token: null });
      },
    }),
    { name: "forkflow-auth" }
  )
);
