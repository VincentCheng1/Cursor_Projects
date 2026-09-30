import type { Metadata } from "next";

import { AuthSessionProvider } from "@/components/providers/session-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "CardVault",
  description: "Track your collection. Know what it's worth.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
