import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { createUser, findUserByEmail } from "@/lib/pos-data.js";
import { withRoute } from "@/lib/route";
import { registerSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";

export const POST = withRoute(async (request) => {
  await requireAdmin(request);

  const body = await parseBody(request, registerSchema);

  const existingUser = await findUserByEmail(body.email);

  if (existingUser) {
    throw new ApiError(409, "CONFLICT", "A user with this email already exists.");
  }

  const password = await hashPassword(body.password);

  const user = await createUser({
    name: body.name,
    email: body.email,
    password,
    role: "cashier"
  });

  if (!user) {
    throw new ApiError(500, "USER_CREATE_FAILED", "User could not be loaded after creation.");
  }

  return NextResponse.json(
    {
      success: true,
      data: user
    },
    { status: 201 }
  );
});
