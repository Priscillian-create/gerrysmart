import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyAccessToken } from "./src/lib/jwt.js";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:4000"];

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

function parseOriginList(rawValue: string | undefined) {
  if (!rawValue) return [];
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function getAllowedOrigins() {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS);

  const envCandidates = [
    process.env.CORS_ORIGINS,
    process.env.FRONTEND_ORIGIN,
    process.env.NEXT_PUBLIC_FRONTEND_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_FRONTEND_URL
  ];

  for (const candidate of envCandidates) {
    for (const origin of parseOriginList(candidate)) {
      origins.add(origin);
    }
  }

  return Array.from(origins);
}

function resolveAllowedOrigin(requestOrigin: string | null) {
  const allowedOrigins = getAllowedOrigins();
  const fallbackOrigin = allowedOrigins[0] ?? null;

  if (!requestOrigin) return fallbackOrigin;
  return allowedOrigins.includes(requestOrigin) ? requestOrigin : fallbackOrigin;
}

function buildCorsHeaders(origin: string | null) {
  const allowedOrigin = resolveAllowedOrigin(origin);
  const headers = new Headers();
  headers.set("Vary", "Origin");
  if (allowedOrigin) headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Credentials", "true");
  return headers;
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
    "/purchases/:path*"
  ]
};
