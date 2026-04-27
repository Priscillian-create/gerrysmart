import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { withRoute } from "../../../lib/route.js";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin, UserRole.cashier]);

  const products = await prisma.product.findMany({
    where: {
      deleted: {
        not: true
      }
    },
    select: {
      id: true,
      name: true,
      category: true,
      stock: true,
      barcode: true,
      expiryDate: true
    },
    orderBy: [{ stock: "asc" }, { name: "asc" }]
  });

  return NextResponse.json({
    data: products.map((product: (typeof products)[number]) => ({
      product: product.name ?? "",
      productId: product.id,
      category: product.category ?? "",
      stock: product.stock ?? 0,
      barcode: product.barcode,
      expiry: product.expiryDate
    }))
  });
});
