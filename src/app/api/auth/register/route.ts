import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { registerSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";

export const POST = withRoute(async (request) => {
  await requireAdmin(request);

  const body = await parseBody(request, registerSchema);

  const existingUser = await prisma.user.findUnique({
    where: { email: body.email }
  });

  if (existingUser) {
    throw new ApiError(409, "CONFLICT", "A user with this email already exists.");
  }

  const password = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      password,
      role: UserRole.cashier
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  return NextResponse.json(
    {
      success: true,
      data: user
    },
    { status: 201 }
  );
});
