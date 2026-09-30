import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/auth/errors";

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId === undefined || userId === "") {
    throw new UnauthorizedError("Authentication required");
  }
  return { session, userId };
}
