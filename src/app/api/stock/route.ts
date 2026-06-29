import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCorsPreflightResponse, withRoute } from "@/lib/route";

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

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}
