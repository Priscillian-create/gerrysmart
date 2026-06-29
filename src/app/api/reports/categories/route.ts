import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { resolveDateRange } from "@/lib/dates";
import { roundCurrency, toNumber } from "@/lib/numbers";
import { getCategorySales } from "@/lib/reporting";
import { createCorsPreflightResponse, withRoute } from "@/lib/route";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const { from, to } = resolveDateRange(request.nextUrl);
  const rows = await getCategorySales(from, to);

  return NextResponse.json({
    data: rows.map((row) => ({
      category: row.category,
      quantitySold: toNumber(row.quantitySold),
      revenue: roundCurrency(toNumber(row.revenue))
    })),
    meta: {
      from,
      to
    }
  });
});

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}
