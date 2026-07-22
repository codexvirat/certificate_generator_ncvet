import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import type { Role } from "@/lib/constants";

export type SessionActor = { id: string; role: Role; organizationId: string | null };

/** Resolves the signed-in actor for a route handler, or returns a 401 response. */
export async function requireActor(): Promise<SessionActor | NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return {
    id: session.user.id,
    role: session.user.role,
    organizationId: session.user.organizationId,
  };
}

export function isActor(value: SessionActor | NextResponse): value is SessionActor {
  return !(value instanceof NextResponse);
}

/** Wrap service calls in route handlers so PermissionError -> 403, other errors -> 400. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof PermissionError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 400 });
}
