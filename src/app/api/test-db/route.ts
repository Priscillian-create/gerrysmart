import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const [users, products] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true }
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stock: true,
        barcode: true,
        expiryDate: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [{ name: "asc" }]
    })
  ]);

  return NextResponse.json({
    data: {
      users,
      products: products.map((p) => ({ ...p, price: p.price.toNumber() }))
    }
  });
});
