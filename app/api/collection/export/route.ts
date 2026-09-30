import { handleRouteError } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { buildCollectionCsv } from "@/lib/collection/csv-export";
import { enrichCollectionItem } from "@/lib/collection/enrich";
import { listCollectionItems } from "@/lib/collection/service";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const items = await listCollectionItems(userId);
    const enriched = await Promise.all(items.map(enrichCollectionItem));
    const csv = buildCollectionCsv(enriched);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cardvault-collection.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
