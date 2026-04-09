import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { productUpdateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";

const paramsSchema = z.object({
  id: z.string().uuid()
});

export const PUT = withRoute<{ id: string }>(async (request, context) => {
  await requireAuth(request, [UserRole.admin]);

  const { id } = paramsSchema.parse(await context.params);
  const body = await parseBody(request, productUpdateSchema);

  if (Object.keys(body).length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Provide at least one field to update.");
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.price !== undefined ? { price: body.price } : {}),
      ...(body.stock !== undefined ? { stock: body.stock } : {}),
      ...(body.barcode !== undefined ? { barcode: body.barcode || null } : {}),
      ...(body.expiryDate !== undefined
        ? {
            expiryDate: body.expiryDate ? parseDateInput(body.expiryDate) : null
          }
        : {})
    }
  });

  return NextResponse.json({
    data: {
      ...product,
      price: product.price.toNumber()
    }
  });
});

export const DELETE = withRoute<{ id: string }>(async (request, context) => {
  await requireAuth(request, [UserRole.admin]);

  const { id } = paramsSchema.parse(await context.params);

  await prisma.product.delete({
    where: { id }
  });

  return new NextResponse(null, { status: 204 });
});
