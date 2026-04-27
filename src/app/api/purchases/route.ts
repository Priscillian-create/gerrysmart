import { NextResponse } from "next/server";
import { ApiError } from "../../../lib/errors.js";
import { requireAuth, UserRole } from "../../../lib/auth.js";
import { parseDateInput } from "../../../lib/dates.js";
import { toNumber } from "../../../lib/numbers.js";
import { prisma } from "../../../lib/prisma.js";
import { withRoute } from "../../../lib/route.js";
import { purchaseCreateSchema, purchaseFilterSchema } from "../../../lib/schemas.js";
import { parseBody, parseQuery } from "../../../lib/validation.js";

function serializePurchase(purchase: any, product?: any | null) {
  return {
    id: purchase.id,
    supplier: purchase.supplier,
    quantity: purchase.quantity,
    date: purchase.date,
    createdAt: purchase.createdAt,
    productId: product?.id ?? null,
    productLegacyId: purchase.productLegacyId,
    productName: purchase.productName,
    unitCost: toNumber(purchase.costPrice),
    unitSell: toNumber(purchase.sellingPrice),
    description: purchase.description,
    invoiceNumber: purchase.invoiceNumber,
    notes: purchase.notes,
    product: product
      ? {
          ...product,
          price: toNumber(product.price)
        }
      : null
  };
}

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const query = parseQuery(request.nextUrl, purchaseFilterSchema);
  const product = query.productId
    ? await prisma.product.findUnique({
        where: { id: query.productId }
      })
    : null;

  if (query.productId && !product) {
    return NextResponse.json({ data: [] });
  }

  const purchases = await prisma.purchase.findMany({
    where: {
      ...(product ? { productLegacyId: product.oldNumericId ?? -1 } : {}),
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

  const legacyIds = Array.from(
    new Set(
      purchases
        .map((purchase: any) => purchase.productLegacyId)
        .filter((value: any) => value !== null)
    )
  );
  const products = legacyIds.length
    ? await prisma.product.findMany({
        where: {
          oldNumericId: {
            in: legacyIds
          }
        },
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          oldNumericId: true
        }
      })
    : [];
  const productMap = new Map(products.map((entry: any) => [entry.oldNumericId, entry]));

  return NextResponse.json({
    data: purchases.map((purchase: any) =>
      serializePurchase(purchase, productMap.get(purchase.productLegacyId ?? -1) ?? null)
    )
  });
});

export const POST = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const body = await parseBody(request, purchaseCreateSchema);

  const result = await prisma.$transaction(async (tx: any) => {
    const product = await tx.product.findUnique({
      where: { id: body.productId }
    });

    if (!product) {
      throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
    }

    if (product.oldNumericId === null) {
      throw new ApiError(
        409,
        "PRODUCT_NOT_LINKED",
        "This product is not linked to the legacy purchases table yet."
      );
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
        date: new Date(),
        supplier: body.supplier,
        productLegacyId: product.oldNumericId,
        productName: product.name ?? body.productId,
        quantity: body.quantity,
        costPrice: body.unitCost,
        sellingPrice: body.unitSell
      }
    });

    return {
      purchase,
      updatedProduct
    };
  });

  return NextResponse.json(
    {
      data: {
        purchase: serializePurchase(result.purchase, result.updatedProduct),
        product: {
          ...result.updatedProduct,
          price: toNumber(result.updatedProduct.price)
        }
      }
    },
    { status: 201 }
  );
});
