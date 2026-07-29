"use client";

// ─────────────────────────────────────────────────────────────
// GoogleSignInButton — "Sign in with Google" for the login + register pages.
//
// THE FLOW (why each piece exists):
//   1. We load Google Identity Services (GIS) — a small script Google hosts.
//   2. GIS draws its own official button. When the user picks an account, GIS
//      hands us a "credential": a signed ID token (a JWT) proving who they are.
//   3. We POST that token to OUR backend (/auth/google). The backend verifies
//      the signature with Google and returns our normal { user, token }.
//   4. We store that with setAuth and route by role — identical to the email
//      login flow, so the rest of the app can't tell how you signed in.
//
// We NEVER read the profile out of the Google token on the client and trust it —
// the browser can't be trusted. The backend is the one that verifies.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import type { User, Role } from "@/lib/types";

// GIS is a plain browser script, so TypeScript doesn't know about `window.google`.
// We declare just the two calls we use so the compiler is happy and autocompletes.
// (`any` for the option bags keeps this small; the shapes are Google's, not ours.)
interface GoogleCredentialResponse {
  credential: string; // the signed ID token (JWT) we forward to our backend
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

// After a successful sign-in, send each role to its home screen — this MUST match
// the routing in the email login/register pages so behaviour is consistent.
function routeForRole(role: Role): string {
  switch (role) {
    case "RESTAURANT_OWNER":
      return "/dashboard/restaurant";
    case "DELIVERY":
      return "/dashboard/delivery";
    case "ADMIN":
      return "/admin";
    default:
      return "/"; // CUSTOMER
  }
}

// onError lets the parent page show the failure in its own error banner.
export default function GoogleSignInButton({
  onError,
}: {
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const setAuth = useAuth((state) => state.setAuth);
  // The empty <div> GIS will draw its button into. We need a ref because GIS
  // renders imperatively (it's not React) — it needs a real DOM node to fill.
  const buttonRef = useRef<HTMLDivElement>(null);

  // The OAuth Client ID is public by design (it identifies our app to Google),
  // so it's a NEXT_PUBLIC_ var baked into the browser bundle.
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // initGoogle wires up GIS and paints the button. We call it once the script has
  // loaded AND the div is mounted (whichever finishes last triggers it).
  function initGoogle() {
    // Guard: script not ready, div not mounted, or no client id → do nothing.
    if (!window.google || !buttonRef.current || !clientId) return;

    // Tell GIS who we are and where to deliver the credential.
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          // Forward ONLY the token. The backend verifies it and upserts the user.
          const data = await apiPost<{ user: User; token: string }>(
            "/auth/google",
            { credential: response.credential }
          );
          setAuth(data.user, data.token); // same store write as email login
          router.push(routeForRole(data.user.role)); // role-based landing page
        } catch (err: any) {
          onError?.(
            err.response?.data?.message || "Google sign-in failed"
          );
        }
      },
    });

    // Draw Google's official button into our div, themed to match our card.
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: "100%",
      text: "continue_with",
      shape: "pill",
    });
  }

  // If the GIS script was already loaded by a previous page visit, window.google
  // exists on mount and Script's onReady won't fire again — so try initializing
  // here too. initGoogle is safe to call more than once (it just re-renders).
  useEffect(() => {
    initGoogle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the client id is missing (Google not configured yet), render nothing so
  // the page still works with email/password only.
  if (!clientId) return null;

  return (
    <>
      {/*
        next/script (afterInteractive = load soon after the page is interactive).
        onReady fires after the script loads AND on every remount, so it's the
        right hook to (re)initialize GIS for this page.
      */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={initGoogle}
      />
      {/* GIS paints its button inside this div. Centered to match the form. */}
      <div ref={buttonRef} className="flex justify-center" />
    </>
  );
}
