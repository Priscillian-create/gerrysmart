import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, UserRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { parseDateInput } from "@/lib/dates";
import { updateProduct } from "@/lib/pos-data.js";
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

  const product = await updateProduct(id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
    ...(body.price !== undefined ? { price: body.price } : {}),
    ...(body.stock !== undefined ? { stock: body.stock } : {}),
    ...(body.barcode !== undefined ? { barcode: body.barcode || null } : {}),
    ...(body.expiryDate !== undefined
      ? {
          expiryDate: body.expiryDate
            ? parseDateInput(body.expiryDate)?.toISOString().slice(0, 10)
            : null
        }
      : {})
  });

  return NextResponse.json({
    data: product
  });
});

export const DELETE = withRoute<{ id: string }>(async (request, context) => {
  await requireAuth(request, [UserRole.admin]);

  paramsSchema.parse(await context.params);

  throw new ApiError(
    405,
    "METHOD_NOT_ALLOWED",
    "Deleting products is not supported by the TiDB legacy schema."
  );
});
