import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, UserRole } from "../../../../lib/auth";
import { softDeleteSale } from "../../../../lib/pos-data.js";
import { withRoute } from "../../../../lib/route";

const paramsSchema = z.object({
  id: z.string().uuid()
});

export const DELETE = withRoute<{ id: string }>(async (request, context) => {
  await requireAuth(request, [UserRole.admin]);

  const { id } = paramsSchema.parse(await context.params);

  await softDeleteSale(id);

  return new NextResponse(null, { status: 204 });
});
