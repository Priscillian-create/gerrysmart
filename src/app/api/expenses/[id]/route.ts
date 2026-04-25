import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

const paramsSchema = z.object({
  id: z.string().uuid()
});

export const DELETE = withRoute<{ id: string }>(async (request, context) => {
  await requireAuth(request, [UserRole.admin]);

  const { id } = paramsSchema.parse(await context.params);

  await prisma.expense.delete({
    where: { id }
  });

  return new NextResponse(null, { status: 204 });
});
