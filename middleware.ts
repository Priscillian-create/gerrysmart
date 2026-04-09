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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api") || publicRoutes.has(pathname)) {
    return NextResponse.next();
  }

  try {
    const token = getBearerToken(request);
    await verifyAccessToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required."
        }
      },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/api/:path*"]
};
