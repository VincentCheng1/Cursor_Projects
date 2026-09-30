import { redirect } from "next/navigation";

import { DiagnosticsClient } from "@/components/diagnostics/diagnostics-client";
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
          Provider status, public data surfaces, database health, and recent sync jobs. Secrets are
          never shown.
        </p>
        <div className="mt-8">
          <DiagnosticsClient />
        </div>
      </div>
    </AppShell>
  );
}
