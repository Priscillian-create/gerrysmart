export default async function handler(req, res) {
  function getAllowedOrigins() {
    const list = [];
    const envList =
      process.env.CORS_ORIGINS ||
      process.env.FRONTEND_URLS ||
      process.env.FRONTEND_URL ||
      "";
    if (envList) {
      envList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((o) => list.push(o));
    }
    if (!list.includes("http://localhost:8090"))
      list.push("http://localhost:8090");
    return list;
  }

  function setCors(res, originHeader) {
    const allowed = getAllowedOrigins();
    const origin = allowed.includes(originHeader)
      ? originHeader
      : allowed[0] || "*";
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
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

  setCors(res, req.headers.origin || "");
  if (req.method === "OPTIONS") {
    setCors(res, req.headers.origin || "");
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

  let isValid = false;
  if (adminEmail && adminPassword) {
    isValid =
      email.toLowerCase() === adminEmail.toLowerCase() &&
      password === adminPassword;
  } else {
    isValid = !!email && !!password;
  }

  if (!isValid) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const jwt = require("jsonwebtoken");
  const secret = process.env.JWT_SECRET || "changeme";
  const token = jwt.sign({ sub: email, role: "admin" }, secret, {
    expiresIn: "7d",
  });

  return res.status(200).json({ success: true, token });
}
