import { getPrisma } from "@/lib/db/client";

import { requireUser } from "./require-user";
import { UnauthorizedError } from "./errors";

export async function requireAdmin() {
  const { userId, session } = await requireUser();
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (user?.isAdmin !== true) {
    throw new UnauthorizedError("Admin access required");
  }
  return { userId, session };
}
