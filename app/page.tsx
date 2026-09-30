import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { listProviderStatus } from "@/lib/pricing/providers/registry";

export default function HomePage() {
  const providers = listProviderStatus();

  return (
    <AppShell>
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <p className="text-sm uppercase tracking-widest text-emerald-400">CardVault</p>
        <h1 className="mt-2 text-4xl font-semibold">Track your collection. Know what it&apos;s worth.</h1>
        <p className="mt-4 text-zinc-400">
          Values are calculated from real completed sales — never invented marketplace data.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg">
        <h2 className="text-lg font-medium">Pricing providers</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {providers.map((p) => (
            <li key={p.id} className="flex justify-between gap-4">
              <span>{p.displayName}</span>
              <span className="text-zinc-400">
                {p.health.status === "READY"
                  ? "READY"
                  : p.health.message}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <nav className="flex gap-4 text-sm">
        <Link className="text-emerald-400 hover:underline" href="/login">Sign in</Link>
        <Link className="text-zinc-400 hover:underline" href="/dashboard">Dashboard</Link>
      </nav>
    </main>
    </AppShell>
  );
}
