import { AppShell } from "@/components/layout/app-shell";
import { CollectionClient } from "@/components/collection/collection-client";

export default function CollectionPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Collection</h1>
        <div className="mt-8">
          <CollectionClient />
        </div>
      </div>
    </AppShell>
  );
}
