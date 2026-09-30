import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/collection", label: "Collection" },
  { href: "/search", label: "Search Cards" },
  { href: "/tracker", label: "Tracker" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 p-4 md:block">
        <Link href="/" className="text-sm font-semibold text-emerald-400">
          CardVault
        </Link>
        <nav className="mt-8 flex flex-col gap-2 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <nav
          className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-zinc-800 bg-zinc-950 p-2 text-xs md:hidden"
          aria-label="Mobile"
        >
          {[
            { href: "/dashboard", label: "Home" },
            { href: "/collection", label: "Collection" },
            { href: "/search", label: "Search" },
            { href: "/tracker", label: "Tracker" },
            { href: "/settings", label: "Watchlist" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="px-2 py-1 text-zinc-400">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
