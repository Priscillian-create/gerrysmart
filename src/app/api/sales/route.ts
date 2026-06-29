import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { listSales } from "@/lib/pos-data";
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
  await requireAuth(request, [UserRole.admin, UserRole.cashier]);

  const { from, to } = resolveSalesRange(request.nextUrl);
  const sales = await listSales({ from, to });

  return NextResponse.json({
    success: true,
    data: sales,
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
