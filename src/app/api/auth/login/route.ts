import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { withRoute } from "@/lib/route";
import { parseBody } from "@/lib/validation";
import { loginSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";

export const POST = withRoute(async (request) => {
  const body = await parseBody(request, loginSchema);

  const user = await prisma.user.findUnique({
    where: { email: body.email }
  });

  if (!user) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const passwordIsValid = await verifyPassword(body.password, user.password);

  if (!passwordIsValid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role
  });

  return NextResponse.json({
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }
  });
});
