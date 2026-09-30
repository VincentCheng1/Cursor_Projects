import { handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import { getPrisma } from "@/lib/db/client";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { jobId } = await params;
    const job = await getPrisma().syncJob.findUnique({ where: { id: jobId } });
    if (job === null) return jsonError("Job not found", 404);
    return jsonOk(job);
  } catch (error) {
    return handleRouteError(error);
  }
}
