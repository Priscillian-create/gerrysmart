import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "../../../../lib/auth";
import { resolveDateRange } from "../../../../lib/dates";
import { roundCurrency, toNumber } from "../../../../lib/numbers";
import { getSummaryMetrics } from "../../../../lib/reporting";
import { withRoute } from "../../../../lib/route";

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
