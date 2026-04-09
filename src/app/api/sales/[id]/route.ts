import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

const paramsSchema = z.object({
  id: z.string().uuid()
});

export const DELETE = withRoute<{ id: string }>(async (request, context) => {
  await requireAuth(request, [UserRole.admin]);

  const { id } = paramsSchema.parse(await context.params);

  await prisma.sale.update({
    where: { id },
    data: {
      deletedAt: new Date()
    }
  });

  return new NextResponse(null, { status: 204 });
});
