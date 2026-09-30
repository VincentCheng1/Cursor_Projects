import { describe, expect, it } from "vitest";

import { UnauthorizedError } from "@/lib/auth/errors";
import { requireOwnership } from "@/lib/auth/ownership";

describe("requireOwnership", () => {
  it("allows matching user", () => {
    expect(() => requireOwnership("u1", "u1")).not.toThrow();
  });

  it("rejects mismatched user", () => {
    expect(() => requireOwnership("u1", "u2")).toThrow(UnauthorizedError);
  });

  it("rejects missing session", () => {
    expect(() => requireOwnership("u1", undefined)).toThrow(UnauthorizedError);
  });
});
