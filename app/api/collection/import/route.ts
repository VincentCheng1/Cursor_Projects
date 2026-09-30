import { z } from "zod";

import { handleRouteError, jsonOk } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/require-user";
import {
  commitCollectionImport,
  validateCollectionCsv,
} from "@/lib/collection/csv-import";

const bodySchema = z.object({
  csv: z.string().min(1).max(5_000_000),
  commit: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = bodySchema.parse(await request.json());

    const { valid, errors } = await validateCollectionCsv(body.csv);

    if (errors.length > 0) {
      return jsonOk({
        committed: false,
        validCount: valid.length,
        errors,
      });
    }

    if (!body.commit) {
      return jsonOk({
        committed: false,
        validCount: valid.length,
        errors: [],
        preview: true,
        message: "Validation passed. Set commit=true to import.",
      });
    }

    const created = await commitCollectionImport(userId, valid);
    return jsonOk({
      committed: true,
      created,
      validCount: valid.length,
      errors: [],
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
