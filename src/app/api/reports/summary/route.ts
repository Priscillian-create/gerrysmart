import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "../../../../lib/auth.js";
import { resolveDateRange } from "../../../../lib/dates.js";
import { roundCurrency, toNumber } from "../../../../lib/numbers.js";
import { getSummaryMetrics } from "../../../../lib/reporting.js";
import { withRoute } from "../../../../lib/route.js";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const { from, to } = resolveDateRange(request.nextUrl);
  const summary = await getSummaryMetrics(from, to);

  return NextResponse.json({
    data: {
      totalSales: roundCurrency(toNumber(summary.totalSales)),
      transactions: toNumber(summary.transactions),
      itemsSold: toNumber(summary.itemsSold),
      paymentBreakdown: {
        cash: roundCurrency(toNumber(summary.cashSales)),
        pos: roundCurrency(toNumber(summary.posSales)),
        transfer: roundCurrency(toNumber(summary.transferSales))
      },
      range: { from, to }
    }
  });
});
