import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createCorsPreflightResponse, withRoute } from "@/lib/route";

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
  await requireAuth(request, [UserRole.admin]);

  const { from, to } = resolveSalesRange(request.nextUrl);
  const sales = await prisma.sale.findMany({
    where: {
      deletedAt: {
        not: null
      },
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {})
            }
          }
        : {})
    },
    orderBy: [{ deletedAt: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({
    success: true,
    data: sales.map((sale: (typeof sales)[number]) => ({
      ...sale,
      total: sale.total.toNumber()
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

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}
