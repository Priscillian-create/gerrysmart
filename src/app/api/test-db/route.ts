import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "../../../lib/auth";
import { toNumber } from "../../../lib/numbers";
import { prisma } from "../../../lib/prisma";
import { withRoute } from "../../../lib/route";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const [users, products] = await Promise.all([
    prisma.user.findMany(),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stock: true,
        barcode: true,
        expiryDate: true,
        updatedAt: true
      },
      orderBy: [{ name: "asc" }]
    })
  ]);

  return NextResponse.json({
    data: {
      users: users.map((user: (typeof users)[number]) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      })),
      products: products.map((p: (typeof products)[number]) => ({
        ...p,
        price: toNumber(p.price)
      }))
    }
  });
});
