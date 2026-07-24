"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Wraps the app so any component can use TanStack Query for server-state caching.
// One QueryClient per browser session (created lazily in state so it survives
// re-renders but isn't shared across requests on the server).
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
