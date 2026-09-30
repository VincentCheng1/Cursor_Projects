import { AppShell } from "@/components/layout/app-shell";
import { TrackerClient } from "@/components/tracker/tracker-client";

export default function TrackerPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header>
          <h1 className="text-3xl font-semibold">Price tracker</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Compare COMBINED snapshot values across up to eight cards — stock-style overlay.
          </p>
        </header>
        <div className="mt-8">
          <TrackerClient />
        </div>
      </div>
    </AppShell>
  );
}
