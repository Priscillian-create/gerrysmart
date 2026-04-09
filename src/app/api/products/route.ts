import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { productCreateSchema, productFilterSchema } from "@/lib/schemas";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin, UserRole.cashier]);

  const query = parseQuery(request.nextUrl, productFilterSchema);

  const products = await prisma.product.findMany({
    where: {
      category: query.category,
      OR: query.search
        ? [
            { name: { contains: query.search } },
            { barcode: { contains: query.search } }
          ]
        : undefined
    },
    orderBy: [{ stock: "asc" }, { name: "asc" }]
  });

  return NextResponse.json({
    data: products.map((product) => ({
      ...product,
      price: product.price.toNumber()
    }))
  });
});

export const POST = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const body = await parseBody(request, productCreateSchema);

  const product = await prisma.product.create({
    data: {
      name: body.name,
      category: body.category,
      price: body.price,
      stock: body.stock,
      barcode: body.barcode || null,
      expiryDate: body.expiryDate ? parseDateInput(body.expiryDate) : null
    }
  });

  return NextResponse.json(
    {
      data: {
        ...product,
        price: product.price.toNumber()
      }
    },
    { status: 201 }
  );
});
