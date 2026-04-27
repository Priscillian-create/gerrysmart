import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "../../../../lib/auth.js";
import { resolveDateRange } from "../../../../lib/dates.js";
import { roundCurrency, toNumber } from "../../../../lib/numbers.js";
import { getCategorySales } from "../../../../lib/reporting.js";
import { withRoute } from "../../../../lib/route.js";

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
