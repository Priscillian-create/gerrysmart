import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";

const publicRoutes = new Set(["/api/auth/login"]);

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing token");
  }
  return authorization.slice(7).trim();
}

function buildCorsHeaders(origin: string | null) {
  const allowed = new Set(
    ["http://localhost:5500", process.env.FRONTEND_ORIGIN].filter(Boolean) as string[]
  );
  const headers = new Headers();
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (origin && allowed.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (request.method === "OPTIONS" && pathname.startsWith("/api")) {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  if (!pathname.startsWith("/api")) {
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
  matcher: ["/api/:path*"]
};
