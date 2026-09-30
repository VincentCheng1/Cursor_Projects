import { AppShell } from "@/components/layout/app-shell";
import { SearchClient } from "@/components/search/search-client";

export default function SearchPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Search cards</h1>
        <div className="mt-8">
          <SearchClient />
        </div>
      </div>
    </AppShell>
  );
}
