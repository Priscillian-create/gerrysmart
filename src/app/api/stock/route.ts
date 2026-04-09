import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin, UserRole.cashier]);

  const products = await prisma.product.findMany({
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
    data: products.map((product) => ({
      product: product.name,
      productId: product.id,
      category: product.category,
      stock: product.stock,
      barcode: product.barcode,
      expiry: product.expiryDate
    }))
  });
});
