import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ForkFlow",
  description: "Order food, track it live.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <QueryProvider>
          <Navbar />
          <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
