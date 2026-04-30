import { SignJWT, jwtVerify } from "jose";

export type AuthTokenPayload = {
  sub: string;
  id?: string;
  email: string;
  role: "admin" | "cashier";
};

function getJwtConfig() {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN?.trim() || "12h";

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters.");
  }

  return {
    secret: new TextEncoder().encode(jwtSecret),
    expiresIn: jwtExpiresIn
  };
}

function parseRole(role: unknown): AuthTokenPayload["role"] {
  if (role === "admin" || role === "cashier") {
    return role;
  }

  throw new Error("Invalid token role.");
}

export async function signAccessToken(payload: AuthTokenPayload) {
  const jwt = getJwtConfig();

  return new SignJWT({
    id: payload.sub,
    email: payload.email,
    role: payload.role
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(jwt.expiresIn)
    .sign(jwt.secret);
}

export async function verifyAccessToken(token: string) {
  const jwt = getJwtConfig();
  const { payload } = await jwtVerify(token, jwt.secret);

  return {
    sub: String(payload.sub),
    id: String(payload.id ?? payload.sub),
    email: String(payload.email),
    role: parseRole(payload.role)
  } satisfies AuthTokenPayload;
}
