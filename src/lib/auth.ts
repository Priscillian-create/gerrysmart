import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import type { AuthTokenPayload } from "@/lib/jwt";
import { verifyAccessToken } from "@/lib/jwt";

export const UserRole = {
  admin: "admin",
  cashier: "cashier",
  user: "user"
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export function getBearerToken(request: NextRequest) {
  const auth = request.headers.get("authorization");

  if (!auth) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing Authorization header.");
  }

  if (!auth.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid Authorization format.");
  }

  return auth.replace("Bearer ", "").trim();
}

function getForwardedAuthPayload(request: NextRequest): AuthTokenPayload | null {
  if (request.headers.get("x-auth-verified") !== "1") {
    return null;
  }

  const sub = request.headers.get("x-auth-sub");
  const id = request.headers.get("x-auth-id");
  const email = request.headers.get("x-auth-email");
  const role = request.headers.get("x-auth-role");

  if (!sub || !id || !email) {
    return null;
  }

  if (role !== "admin" && role !== "cashier") {
    return null;
  }

  return {
    sub,
    id,
    email,
    role
  };
}

export async function requireAuth(
  request: NextRequest,
  roles?: UserRole[]
) {
  console.log("ROUTE AUTH HEADER:", request.headers.get("authorization"));
  console.log("ROUTE JWT_SECRET_LOADED:", !!process.env.JWT_SECRET);

  let payload = getForwardedAuthPayload(request);

  if (payload) {
    console.log("ROUTE AUTH PAYLOAD:", payload);
  } else {
    const token = getBearerToken(request);

    try {
      console.log("ROUTE TOKEN RECEIVED:", token);
      payload = await verifyAccessToken(token);
      console.log("ROUTE JWT VALID:", payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid or expired bearer token.";

      console.error("ROUTE JWT VERIFICATION FAILED:", {
        message,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired bearer token.", {
        debug: message
      });
    }
  }

  if (roles && !roles.includes(payload.role)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this resource.");
  }

  return payload;
}

export async function requireAdmin(request: NextRequest) {
  return requireAuth(request, [UserRole.admin]);
}
