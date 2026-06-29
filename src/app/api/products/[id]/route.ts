import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { toNumber } from "@/lib/numbers";
import { updateProduct } from "@/lib/pos-data";
import { prisma } from "@/lib/prisma";
export { createCorsPreflightResponse as OPTIONS } from "@/lib/route";
import { withRoute } from "@/lib/route";
import { productUpdateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";

type ProductRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function serializeProduct(product: {
  id: string;
  name: string | null;
  category: string | null;
  price: any;
  stock: number | null;
  barcode: string | null;
  expiryDate: Date | null;
  status: string;
  updatedAt: Date | null;
}) {
  return {
    id: product.id,
    name: product.name ?? "",
    category: product.category ?? "",
    price: toNumber(product.price),
    stock: Number(product.stock ?? 0),
    barcode: product.barcode ?? null,
    expiryDate: product.expiryDate ? product.expiryDate.toISOString().slice(0, 10) : null,
    status: product.status,
    updatedAt: product.updatedAt
  };
}

export const GET = withRoute(async (request, context: ProductRouteContext) => {
  await requireAuth(request, [UserRole.admin, UserRole.cashier]);

  const { id } = await context.params;
  const product = await prisma.product.findFirst({
    where: {
      id,
      deleted: {
        not: true
      }
    }
  });

  if (!product) {
    throw new ApiError(404, "NOT_FOUND", "Product not found.");
  }

  return NextResponse.json({
    data: serializeProduct(product)
  });
});

export const PUT = withRoute(async (request, context: ProductRouteContext) => {
  await requireAuth(request, [UserRole.admin]);

  const { id } = await context.params;
  const body = await parseBody(request, productUpdateSchema);
  const product = await updateProduct(id, {
    ...body,
    expiryDate:
      body.expiryDate === undefined
        ? undefined
        : body.expiryDate
          ? parseDateInput(body.expiryDate)?.toISOString().slice(0, 10) ?? null
          : null
  });

  return NextResponse.json({
    data: product
  });
});

export const DELETE = withRoute(async (request, context: ProductRouteContext) => {
  await requireAuth(request, [UserRole.admin]);

  const { id } = await context.params;
  const result = await prisma.product.updateMany({
    where: {
      id,
      deleted: {
        not: true
      }
    },
    data: {
      deleted: true,
      deletedAt: new Date()
    }
  });

  if (result.count === 0) {
    throw new ApiError(404, "NOT_FOUND", "Product not found.");
  }

  return NextResponse.json({
    success: true
  });
});
