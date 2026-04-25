import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { resolveDateRange } from "@/lib/dates";
import { roundCurrency, toNumber } from "@/lib/numbers";
import { getDailySales } from "@/lib/reporting";
import { withRoute } from "@/lib/route";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const { from, to } = resolveDateRange(request.nextUrl);
  const rows = await getDailySales(from, to);

  return NextResponse.json({
    data: rows.map((row) => ({
      day: row.day,
      totalSales: roundCurrency(toNumber(row.totalSales)),
      transactions: toNumber(row.transactions),
      itemsSold: toNumber(row.itemsSold)
    })),
    meta: {
      from,
      to
    }
  });
});
