"use client";

// Step 1: Pull both the provider component AND its prop types from the package
// root. Newer versions of next-themes dropped the old "next-themes/dist/types"
// subpath and re-export ThemeProviderProps from the main entry instead.
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
