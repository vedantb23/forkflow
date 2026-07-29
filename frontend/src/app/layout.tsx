import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ForkFlow - Premium Delivery Services",
  description: "Experience concierge-level dining from the city's finest kitchens to your door.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        {/*
          Step 1: Preconnect to Google's font hosts so the icon font starts
          downloading as early as possible (icons are above-the-fold here).
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          Step 2: Load Material Symbols Outlined using Google's CANONICAL axis
          tuple. The axis list before "@" (opsz,wght,FILL,GRAD) must match the
          value ranges after it, in the same order. The old URL dropped opsz/GRAD
          which made the request non-standard. `display=block` tells the browser
          to briefly hide the text instead of flashing the raw word ("restaurant")
          before the icon font swaps in.
        */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
