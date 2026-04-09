import { PaymentMethod, Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { generateReceiptNumber } from "@/lib/receipt";
import { withRoute } from "@/lib/route";
import { checkoutSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";

function serializeSale(
  sale: Prisma.SaleGetPayload<{
    include: {
      items: {
        include: {
          product: true;
        };
      };
    };
  }>
) {
  return {
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    total: sale.total.toNumber(),
    paymentMethod: sale.paymentMethod,
    createdAt: sale.createdAt,
    idempotencyKey: sale.idempotencyKey,
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.price.toNumber(),
      lineTotal: item.price.toNumber() * item.quantity
    }))
  };
}

export const POST = withRoute(async (request) => {
  const auth = await requireAuth(request, [UserRole.admin, UserRole.cashier]);
  const body = await parseBody(request, checkoutSchema);

  const groupedItems = Array.from(
    body.items.reduce((map, item) => {
      const current = map.get(item.productId) ?? 0;
      map.set(item.productId, current + item.quantity);
      return map;
    }, new Map<string, number>())
  ).map(([productId, quantity]) => ({ productId, quantity }));

  const existingSale = await prisma.sale.findUnique({
    where: { idempotencyKey: body.idempotencyKey },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (existingSale) {
    return NextResponse.json({
      data: serializeSale(existingSale),
      meta: { idempotentReplay: true }
    });
  }

  try {
    const sale = await prisma.$transaction(
      async (tx) => {
        const duplicate = await tx.sale.findUnique({
          where: { idempotencyKey: body.idempotencyKey },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });

        if (duplicate) {
          return duplicate;
        }

        const products = await tx.product.findMany({
          where: {
            id: {
              in: groupedItems.map((item) => item.productId)
            }
          }
        });

        if (products.length !== groupedItems.length) {
          throw new ApiError(404, "PRODUCT_NOT_FOUND", "One or more products do not exist.");
        }

        const productMap = new Map(products.map((product) => [product.id, product]));
        let total = 0;

        for (const item of groupedItems) {
          const product = productMap.get(item.productId);

          if (!product) {
            throw new ApiError(404, "PRODUCT_NOT_FOUND", "One or more products do not exist.");
          }

          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: {
                gte: item.quantity
              }
            },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });

          if (updated.count === 0) {
            throw new ApiError(
              409,
              "INSUFFICIENT_STOCK",
              `Insufficient stock for product ${product.name}.`
            );
          }

          total += product.price.toNumber() * item.quantity;
        }

        return tx.sale.create({
          data: {
            total,
            paymentMethod: body.paymentMethod as PaymentMethod,
            idempotencyKey: body.idempotencyKey,
            receiptNumber: generateReceiptNumber(),
            userId: auth.sub,
            items: {
              create: groupedItems.map((item) => {
                const product = productMap.get(item.productId)!;

                return {
                  productId: item.productId,
                  quantity: item.quantity,
                  price: product.price
                };
              })
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );

    return NextResponse.json(
      {
        data: serializeSale(sale),
        meta: { idempotentReplay: false }
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = await prisma.sale.findUnique({
        where: { idempotencyKey: body.idempotencyKey },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (duplicate) {
        return NextResponse.json({
          data: serializeSale(duplicate),
          meta: { idempotentReplay: true }
        });
      }
    }

    throw error;
  }
});
