import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { validateBarcodeValue } from "@/lib/barcodes";
import { prisma } from "@/lib/prisma";
import { createCorsPreflightResponse, withRoute } from "@/lib/route";

export const POST = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin, UserRole.cashier]);

  const body = await request.json().catch(() => ({}));
  const productId = String(body?.productId ?? body?.id ?? "").trim() || null;
  const validation = validateBarcodeValue(body?.barcode, body?.barcodeFormat);

  if (!validation.valid) {
    return NextResponse.json(
      {
        available: false,
        duplicate: false,
        error: validation.message,
        value: validation.value,
        format: validation.format
      },
      { status: 400 }
    );
  }

  const duplicate = await prisma.product.findFirst({
    where: {
      barcode: validation.value,
      deleted: {
        not: true
      },
      ...(productId ? { NOT: { id: productId } } : {})
    },
    select: {
      id: true
    }
  });

  return NextResponse.json({
    available: !duplicate,
    duplicate: Boolean(duplicate),
    value: validation.value,
    format: validation.format
  });
});

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}
