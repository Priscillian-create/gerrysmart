import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { resolveDateRange } from "@/lib/dates";
import { roundCurrency, toNumber } from "@/lib/numbers";
import { getProductSales } from "@/lib/reporting";
import { withRoute } from "@/lib/route";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const { from, to } = resolveDateRange(request.nextUrl);
  const rows = await getProductSales(from, to);

  return NextResponse.json({
    data: rows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
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
