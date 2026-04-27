import { SignJWT } from "jose";

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

  function methodNotAllowed(res) {
    return res
      .status(405)
      .json({ success: false, message: "Method Not Allowed" });
  }

  async function readJsonBody(req) {
    if (req.body && typeof req.body === "object") return req.body;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    try {
      return JSON.parse(raw || "{}");
    } catch {
      return {};
    }
  }

  setCors(req, res);
  if (req.method === "OPTIONS") {
    setCors(req, res);
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  const body = await readJsonBody(req);
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({
      success: false,
      message: "ADMIN_EMAIL and ADMIN_PASSWORD must be configured",
    });
  }

  const isValid =
    email.toLowerCase() === adminEmail.toLowerCase() &&
    password === adminPassword;

  if (!isValid) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "JWT_SECRET must be configured",
    });
  }

  const token = await new SignJWT({ role: "admin", email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  return res.status(200).json({ success: true, token });
}
