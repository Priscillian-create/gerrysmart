import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

export const GET = withRoute(async () => {
  const userCount = await prisma.user.count().catch(() => null);
  return NextResponse.json({
    ok: true,
    userTable: userCount !== null,
    userCount
  });
});

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
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
  return new NextResponse(null, { status: 200, headers });
}
