import { NextResponse } from "next/server";
import { findUserByEmail } from "../../../../lib/pos-data.js";
import { prisma } from "../../../../lib/prisma.js";
import { signAccessToken } from "../../../../lib/jwt.js";
import { hashPassword, verifyPassword } from "../../../../lib/password.js";
import { withRoute } from "../../../../lib/route.js";
import { parseBody } from "../../../../lib/validation.js";
import { loginSchema } from "../../../../lib/schemas.js";
import { ApiError } from "../../../../lib/errors.js";

function resolveAccessRole(role: string | null | undefined) {
  if (role === "admin" || role === "cashier") {
    return role;
  }

  throw new ApiError(403, "FORBIDDEN", "This account cannot sign in to the POS.");
}

export const POST = withRoute(async (request) => {
  const body = await parseBody(request, loginSchema);
  const normalizedEmail = body.email.trim().toLowerCase();

  let user = await findUserByEmail(normalizedEmail);
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";

  const isAdminBootstrapAttempt =
    Boolean(adminEmail && adminPassword) &&
    normalizedEmail === adminEmail &&
    body.password === adminPassword;

  if (
    (!user?.password || !user.email) &&
    isAdminBootstrapAttempt
  ) {
    const passwordHash = await hashPassword(adminPassword);
    const adminUser = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        password: passwordHash,
        role: "admin"
      },
      create: {
        email: normalizedEmail,
        password: passwordHash,
        role: "admin"
      }
    });

    user = {
      id: adminUser.id,
      email: adminUser.email,
      password: adminUser.password,
      role: adminUser.role
    };
  }

  if (!user?.password || !user.email) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const passwordIsValid = await verifyPassword(body.password, user.password);

  if (!passwordIsValid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const accessRole = resolveAccessRole(user.role);
  const accessToken = await signAccessToken({
    sub: String(user.id),
    email: user.email,
    role: accessRole
  });

  const response = NextResponse.json({
    success: true,
    token: accessToken,
    accessToken,
    authToken: accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: accessRole
    }
  });

  response.cookies.set("authToken", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  response.cookies.set("pos_access_token", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  return response;
});
