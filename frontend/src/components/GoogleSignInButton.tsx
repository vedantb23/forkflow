"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import type { User, Role } from "@/lib/types";

interface GoogleCredentialResponse {
  credential: string;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

function routeForRole(role: Role): string {
  switch (role) {
    case "RESTAURANT_OWNER":
      return "/dashboard/restaurant";
    case "DELIVERY":
      return "/dashboard/delivery";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}

export default function GoogleSignInButton({
  onError,
}: {
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const setAuth = useAuth((state) => state.setAuth);

  const buttonRef = useRef<HTMLDivElement>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  function initGoogle() {

    if (!window.google || !buttonRef.current || !clientId) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {

          const data = await apiPost<{ user: User; token: string }>(
            "/auth/google",
            { credential: response.credential }
          );
          setAuth(data.user, data.token);
          router.push(routeForRole(data.user.role));
        } catch (err: any) {
          onError?.(
            err.response?.data?.message || "Google sign-in failed"
          );
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: "100%",
      text: "continue_with",
      shape: "pill",
    });
  }

  useEffect(() => {
    initGoogle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!clientId) return null;

  return (
    <>
      {}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={initGoogle}
      />
      {}
      <div ref={buttonRef} className="flex justify-center" />
    </>
  );
}
