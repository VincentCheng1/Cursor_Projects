import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db/client";

export default async function AdminDiagnosticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (user?.isAdmin !== true) redirect("/dashboard");

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Admin diagnostics</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Provider status, database health, and recent sync jobs. Secrets are never shown.
        </p>
        <p className="mt-4 text-sm">
          Live JSON:{" "}
          <code className="rounded bg-zinc-900 px-2 py-1">GET /api/admin/diagnostics</code>
        </p>
      </div>
    </AppShell>
  );
}
