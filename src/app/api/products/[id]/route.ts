import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export { createCorsPreflightResponse as OPTIONS } from "@/lib/route";
import { withRoute } from "@/lib/route";

export const GET = withRoute(async () => {
  const userCount = await prisma.user.count().catch(() => null);
  return NextResponse.json({
    ok: true,
    userTable: userCount !== null,
    userCount
  });
});
