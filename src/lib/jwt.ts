import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "./env.js";

export type AuthTokenPayload = {
  sub: string;
  id?: string;
  email: string;
  role: "admin" | "cashier";
};

function parseRole(role: unknown): AuthTokenPayload["role"] {
  if (role === "admin" || role === "cashier") {
    return role;
  }

  throw new Error("Invalid token role.");
}

export async function signAccessToken(payload: AuthTokenPayload) {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return new SignJWT({
    id: payload.sub,
    email: payload.email,
    role: payload.role
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);

  return {
    sub: String(payload.sub),
    id: String(payload.id ?? payload.sub),
    email: String(payload.email),
    role: parseRole(payload.role)
  } satisfies AuthTokenPayload;
}
