import { UnauthorizedError } from "./errors";

/** Ensures a collection resource belongs to the signed-in user (spec §37). */
export function requireOwnership(resourceUserId: string, sessionUserId: string | undefined): void {
  if (sessionUserId === undefined || sessionUserId === "") {
    throw new UnauthorizedError("Authentication required");
  }
  if (resourceUserId !== sessionUserId) {
    throw new UnauthorizedError();
  }
}
