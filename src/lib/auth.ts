import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { verifyAccessToken } from "@/lib/jwt";

export const UserRole = {
  admin: "admin",
  cashier: "cashier",
  user: "user"
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

function getCookieToken(request: NextRequest) {
  const tokenCookieKeys = [
    "authToken",
    "pos_access_token",
    "accessToken",
    "token",
    "jwt"
  ];

  for (const key of tokenCookieKeys) {
    const value = request.cookies.get(key)?.value?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

export function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    const cookieToken = getCookieToken(request);
    if (cookieToken) {
      return cookieToken;
    }
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
