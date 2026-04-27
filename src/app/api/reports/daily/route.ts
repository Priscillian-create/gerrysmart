import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "../../../../lib/auth.js";
import { resolveDateRange } from "../../../../lib/dates.js";
import { roundCurrency, toNumber } from "../../../../lib/numbers.js";
import { getDailySales } from "../../../../lib/reporting.js";
import { withRoute } from "../../../../lib/route.js";

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
