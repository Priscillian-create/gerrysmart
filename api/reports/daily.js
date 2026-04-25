import { jwtVerify } from "jose";

export default async function handler(req, res) {
  function parseOriginList(rawValue) {
    if (!rawValue) return [];
    return String(rawValue)
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  function getAllowedOrigins() {
    const origins = new Set(["http://localhost:4000"]);

    const envCandidates = [
      process.env.CORS_ORIGINS,
      process.env.FRONTEND_ORIGIN,
      process.env.NEXT_PUBLIC_FRONTEND_ORIGIN,
      process.env.FRONTEND_URL,
      process.env.NEXT_PUBLIC_FRONTEND_URL
    ];

    for (const candidate of envCandidates) {
      for (const origin of parseOriginList(candidate)) {
        origins.add(origin);
      }
    }

    return Array.from(origins);
  }

  function setCors(req, res) {
    const requestOrigin = req.headers.origin || "";
    const allowedOrigins = getAllowedOrigins();
    const fallbackOrigin = allowedOrigins[0] || "";
    const allowedOrigin = allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : fallbackOrigin;

    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  function unauthorized(res, message) {
    return res
      .status(401)
      .json({ success: false, message: message || "Unauthorized" });
  }

  function methodNotAllowed(res) {
    return res
      .status(405)
      .json({ success: false, message: "Method Not Allowed" });
  }

  async function verifyAuth(req) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return null;
    if (!process.env.JWT_SECRET) return null;
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET)
      );
      return payload;
    } catch {
      return null;
    }
  }

  setCors(req, res);
  if (req.method === "OPTIONS") {
    setCors(req, res);
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return methodNotAllowed(res);
  }

  const user = await verifyAuth(req);
  if (!user) return unauthorized(res);

  const today = new Date();
  const r = {
    date: today.toISOString().slice(0, 10),
    totalSales: 0,
    totalTransactions: 0,
    topProducts: [],
  };

  return res.status(200).json({ success: true, data: r });
}
