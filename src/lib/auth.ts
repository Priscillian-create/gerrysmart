import { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { verifyAccessToken } from "@/lib/jwt";

export function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing bearer token.");
  }

  return authorization.slice(7).trim();
}

export async function requireAuth(
  request: NextRequest,
  roles?: UserRole[]
) {
  const token = getBearerToken(request);
  const payload = await verifyAccessToken(token);

  if (roles && !roles.includes(payload.role)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this resource.");
  }

  return payload;
}

export async function requireAdmin(request: NextRequest) {
  return requireAuth(request, [UserRole.admin]);
}
