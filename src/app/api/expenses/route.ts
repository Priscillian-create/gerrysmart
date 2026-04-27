import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "../../../lib/auth.js";
import { parseDateInput } from "../../../lib/dates.js";
import { prisma } from "../../../lib/prisma.js";
import { withRoute } from "../../../lib/route.js";
import { expenseCreateSchema, expenseFilterSchema } from "../../../lib/schemas.js";
import { parseBody, parseQuery } from "../../../lib/validation.js";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const query = parseQuery(request.nextUrl, expenseFilterSchema);

  const expenses = await prisma.expense.findMany({
    where: {
      category: query.category,
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: parseDateInput(query.from) } : {}),
              ...(query.to ? { lte: parseDateInput(query.to, true) } : {})
            }
          }
        : {})
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({
    data: expenses.map((expense: (typeof expenses)[number]) => ({
      ...expense,
      amount: expense.amount.toNumber()
    }))
  });
});

export const POST = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const body = await parseBody(request, expenseCreateSchema);

  const expense = await prisma.expense.create({
    data: {
      description: body.description,
      category: body.category,
      amount: body.amount,
      date: parseDateInput(body.date) ?? new Date()
    }
  });

  return NextResponse.json(
    {
      data: {
        ...expense,
        amount: expense.amount.toNumber()
      }
    },
    { status: 201 }
  );
});
