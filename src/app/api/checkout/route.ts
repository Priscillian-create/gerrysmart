import { NextResponse } from "next/server";
import { requireAuth, UserRole } from "../../../lib/auth";
import { createCheckoutSale } from "../../../lib/pos-data.js";
import { withRoute } from "../../../lib/route";
import { checkoutSchema } from "../../../lib/schemas";
import { parseBody } from "../../../lib/validation";

export const POST = withRoute(async (request) => {
  await requireAuth(request, [UserRole.admin, UserRole.cashier]);
  const body = await parseBody(request, checkoutSchema);

  const result = await createCheckoutSale({
    items: body.items,
    paymentMethod: body.paymentMethod,
    idempotencyKey: body.idempotencyKey
  });

  return NextResponse.json(
    {
      data: result.sale,
      meta: { idempotentReplay: result.idempotentReplay }
    },
    { status: result.idempotentReplay ? 200 : 201 }
  );
});
