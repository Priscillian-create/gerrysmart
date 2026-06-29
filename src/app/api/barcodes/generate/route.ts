import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "@/lib/auth";
import { generateBarcodeCandidate } from "@/lib/barcodes";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createCorsPreflightResponse, withRoute } from "@/lib/route";

async function generateUniqueBarcode(excludeId: string | null) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const barcode = generateBarcodeCandidate();
    const duplicate = await prisma.product.findFirst({
      where: {
        barcode,
        deleted: {
          not: true
        },
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: {
        id: true
      }
    });

    if (!duplicate) {
      return barcode;
    }
  }

  throw new ApiError(409, "BARCODE_GENERATION_FAILED", "Failed to generate a unique barcode.");
}

export const POST = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin]);

  const body = await request.json().catch(() => ({}));
  const productId = String(body?.productId ?? body?.id ?? "").trim() || null;
  const productName = String(body?.productName ?? body?.name ?? "").trim();

  if (!productName && !productId) {
    throw new ApiError(400, "VALIDATION_ERROR", "Product name is required to generate a barcode.");
  }

  const linkedProduct = productId
    ? await prisma.product.findFirst({
        where: {
          id: productId,
          deleted: {
            not: true
          }
        },
        select: {
          id: true
        }
      })
    : null;

  if (productId && !linkedProduct) {
    throw new ApiError(404, "NOT_FOUND", "Product not found.");
  }

  const barcode = await generateUniqueBarcode(productId);

  return NextResponse.json({
    barcode,
    barcodeFormat: "UPC"
  });
});

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}
