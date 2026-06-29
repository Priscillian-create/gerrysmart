import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { createProduct, listProducts } from "@/lib/pos-data";
import { createCorsPreflightResponse, withRoute } from "@/lib/route";
import { productCreateSchema, productFilterSchema } from "@/lib/schemas";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin, UserRole.cashier]);

  const query = parseQuery(request.nextUrl, productFilterSchema);
  const products = await listProducts({
    category: query.category,
    search: query.search
  });

  return NextResponse.json({
    data: products
  });
});

export const POST = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const body = await parseBody(request, productCreateSchema);
  const product = await createProduct({
    name: body.name,
    category: body.category,
    price: body.price,
    stock: body.stock,
    barcode: body.barcode || null,
    expiryDate: body.expiryDate ? parseDateInput(body.expiryDate)?.toISOString().slice(0, 10) : null
  });

  return NextResponse.json(
    {
      data: product
    },
    { status: 201 }
  );
});

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}
