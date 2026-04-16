import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { roundCurrency } from "@/lib/numbers";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

function resolveSalesRange(url: URL) {
  const fromParam =
    url.searchParams.get("from") ??
    url.searchParams.get("start") ??
    undefined;
  const toParam =
    url.searchParams.get("to") ??
    url.searchParams.get("end") ??
    undefined;

  const from = parseDateInput(fromParam);
  const to = parseDateInput(toParam, true);

  if (from && to && from > to) {
    throw new ApiError(
      400,
      "INVALID_DATE_RANGE",
      "The start date must be before the end date."
    );
  }

  return { from, to };
}

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin, UserRole.cashier]);

  const { from, to } = resolveSalesRange(request.nextUrl);

  const sales = await prisma.sale.findMany({
    where: {
      deletedAt: null,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {})
            }
          }
        : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      items: {
        include: {
          product: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });

  return NextResponse.json({
    success: true,
    data: sales.map((sale) => ({
      id: sale.id,
      receiptNumber: sale.receiptNumber,
      total: roundCurrency(sale.total.toNumber()),
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      user: sale.user,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: roundCurrency(item.price.toNumber()),
        lineTotal: roundCurrency(item.price.toNumber() * item.quantity)
      }))
    })),
    meta: {
      count: sales.length,
      range: {
        from,
        to
      }
    }
  });
});
