import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="mt-8">
          <DashboardClient />
        </div>
      </div>
    </AppShell>
  );
}
