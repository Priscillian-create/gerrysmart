import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resolveDateRange } from "@/lib/dates";
import { roundCurrency, toNumber } from "@/lib/numbers";
import {
  getDailySales,
  getExpenseTotal,
  getProductSales,
  getPurchaseCost,
  getSummaryMetrics
} from "@/lib/reporting";
import { withRoute } from "@/lib/route";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const { from, to } = resolveDateRange(request.nextUrl);

  const [summary, expenseTotal, purchaseCost, dailySales, productSales] =
    await Promise.all([
      getSummaryMetrics(from, to),
      getExpenseTotal(from, to),
      getPurchaseCost(from, to),
      getDailySales(from, to),
      getProductSales(from, to)
    ]);

  const revenue = roundCurrency(toNumber(summary.totalSales));
  const expenses = roundCurrency(toNumber(expenseTotal));
  const purchases = roundCurrency(toNumber(purchaseCost));
  const profit = roundCurrency(revenue - expenses - purchases);
  const profitMargin = revenue > 0 ? roundCurrency((profit / revenue) * 100) : 0;

  return NextResponse.json({
    data: {
      revenue,
      expenses,
      purchases,
      profit,
      profitMargin,
      salesTrends: dailySales.map((row) => ({
        day: row.day,
        revenue: roundCurrency(toNumber(row.totalSales)),
        transactions: toNumber(row.transactions),
        itemsSold: toNumber(row.itemsSold)
      })),
      topProducts: productSales.slice(0, 5).map((row) => ({
        productId: row.productId,
        productName: row.productName,
        category: row.category,
        quantitySold: toNumber(row.quantitySold),
        revenue: roundCurrency(toNumber(row.revenue))
      })),
      paymentBreakdown: {
        cash: roundCurrency(toNumber(summary.cashSales)),
        pos: roundCurrency(toNumber(summary.posSales)),
        transfer: roundCurrency(toNumber(summary.transferSales))
      },
      range: { from, to }
    }
  });
});
