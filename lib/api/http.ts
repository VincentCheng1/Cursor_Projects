import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { UnauthorizedError } from "@/lib/auth/errors";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return jsonError(error.message, 401);
  }
  if (error instanceof ZodError) {
    return jsonError("Invalid request", 400, { issues: error.issues });
  }
  if (error instanceof Error && error.message.includes("Rate limit")) {
    return jsonError(error.message, 429);
  }
  console.error(error);
  return jsonError("Internal server error", 500);
}
