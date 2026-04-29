import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import { verifyAccessToken } from "./src/lib/jwt.js";

const publicRoutes = new Set([
  "/api/auth/login",
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

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    const cookieToken = getCookieToken(request);
    if (cookieToken) {
      return cookieToken;
    }
    throw new Error("Missing token");
  }
  return authorization.slice(7).trim();
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
    await verifyAccessToken(token);
    const res = NextResponse.next();
    corsHeaders.forEach((v, k) => res.headers.set(k, v));
    return res;
  } catch {
    const res = NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required."
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
