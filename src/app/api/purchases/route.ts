import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { purchaseCreateSchema, purchaseFilterSchema } from "@/lib/schemas";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const query = parseQuery(request.nextUrl, purchaseFilterSchema);

  const purchases = await prisma.purchase.findMany({
    where: {
      productId: query.productId,
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: parseDateInput(query.from) } : {}),
              ...(query.to ? { lte: parseDateInput(query.to, true) } : {})
            }
          }
        : {})
    },
    include: {
      product: true
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return NextResponse.json({
    data: purchases.map((purchase) => ({
      ...purchase,
      unitCost: purchase.unitCost.toNumber(),
      unitSell: purchase.unitSell.toNumber(),
      product: {
        ...purchase.product,
        price: purchase.product.price.toNumber()
      }
    }))
  });
});

export const POST = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const body = await parseBody(request, purchaseCreateSchema);

  const result = await prisma.$transaction(
    async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: body.productId }
      });

      if (!product) {
        throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
      }

      const updatedProduct = await tx.product.update({
        where: { id: body.productId },
        data: {
          stock: {
            increment: body.quantity
          },
          price: body.unitSell
        }
      });

      const purchase = await tx.purchase.create({
        data: {
          supplier: body.supplier,
          productId: body.productId,
          quantity: body.quantity,
          unitCost: body.unitCost,
          unitSell: body.unitSell
        },
        include: {
          product: true
        }
      });

      return {
        purchase,
        updatedProduct
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );

  return NextResponse.json(
    {
      data: {
        purchase: {
          ...result.purchase,
          unitCost: result.purchase.unitCost.toNumber(),
          unitSell: result.purchase.unitSell.toNumber(),
          product: {
            ...result.purchase.product,
            price: result.purchase.product.price.toNumber()
          }
        },
        product: {
          ...result.updatedProduct,
          price: result.updatedProduct.price.toNumber()
        }
      }
    },
    { status: 201 }
  );
});
