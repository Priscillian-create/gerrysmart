import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import type { AuthTokenPayload } from "@/lib/jwt";
import { verifyAccessToken } from "@/lib/jwt";

const publicRoutes = new Set([
  "/api/auth/login",
  "/api/debug/headers",
  "/api/health",
  "/auth/login"
]);
const legacyRoutePrefixes = [
  "/auth",
  "/checkout",
  "/expenses",
  "/products",
  "/purchases",
  "/reports",
  "/sales",
  "/stock"
];

function getBearerToken(request: NextRequest) {
  const auth = request.headers.get("authorization");

  if (!auth) {
    throw new Error("Missing Authorization header");
  }

  if (!auth.startsWith("Bearer ")) {
    throw new Error("Invalid Authorization format");
  }

  return auth.replace("Bearer ", "").trim();
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: String(error),
    stack: undefined
  };
}

function buildAuthenticatedRequestHeaders(
  request: NextRequest,
  decoded: AuthTokenPayload
) {
  const requestHeaders = new Headers(request.headers);

  requestHeaders.delete("x-auth-verified");
  requestHeaders.delete("x-auth-sub");
  requestHeaders.delete("x-auth-id");
  requestHeaders.delete("x-auth-email");
  requestHeaders.delete("x-auth-role");

  requestHeaders.set("x-auth-verified", "1");
  requestHeaders.set("x-auth-sub", decoded.sub);
  requestHeaders.set("x-auth-id", decoded.id ?? decoded.sub);
  requestHeaders.set("x-auth-email", decoded.email);
  requestHeaders.set("x-auth-role", decoded.role);

  return requestHeaders;
}

function isLegacyApiPath(pathname: string) {
  return legacyRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);
  const isApiPath = pathname.startsWith("/api");
  const isLegacyPath = isLegacyApiPath(pathname);
  const requiresCorsHandling = isApiPath || isLegacyPath;

  console.log("ALL HEADERS:", Object.fromEntries(request.headers.entries()));
  console.log("AUTH HEADER:", request.headers.get("authorization"));
  console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

  if (request.method === "OPTIONS" && requiresCorsHandling) {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  if (!requiresCorsHandling) {
    const res = NextResponse.next();
    corsHeaders.forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  if (publicRoutes.has(pathname)) {
    const res = NextResponse.next();
    corsHeaders.forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  try {
    const token = getBearerToken(request);
    console.log("TOKEN RECEIVED:", token);
    const decoded = await verifyAccessToken(token);
    console.log("JWT VALID:", decoded);
    const res = NextResponse.next({
      request: {
        headers: buildAuthenticatedRequestHeaders(request, decoded)
      }
    });
    corsHeaders.forEach((v, k) => res.headers.set(k, v));
    return res;
  } catch (error) {
    const errorDetails = getErrorDetails(error);
    console.error("JWT VERIFICATION FAILED:", errorDetails);
    const res = NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
          debug: errorDetails.message,
          details: errorDetails.message
        }
      },
      { status: 401 }
    );
    corsHeaders.forEach((v, k) => res.headers.set(k, v));
    return res;
  }
}

export const config = {
  matcher: [
    "/api/:path*",
    "/auth",
    "/auth/:path*",
    "/checkout",
    "/checkout/:path*",
    "/stock",
    "/stock/:path*",
    "/products/:path*",
    "/sales/:path*",
    "/expenses/:path*",
    "/purchases/:path*",
    "/reports/:path*"
  ]
};
