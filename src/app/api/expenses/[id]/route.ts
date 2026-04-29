import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createCorsPreflightResponse, withRoute } from "@/lib/route";

type ExpenseRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const DELETE = withRoute(async (request, context: ExpenseRouteContext) => {
  await requireAuth(request, [UserRole.admin]);

  const { id } = await context.params;
  const result = await prisma.expense.deleteMany({
    where: { id }
  });

  if (result.count === 0) {
    throw new ApiError(404, "NOT_FOUND", "Expense not found.");
  }

  return NextResponse.json({
    success: true
  });
});

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}
