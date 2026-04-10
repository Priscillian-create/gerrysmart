export default async function handler(req, res) {
  function setCors(res, originHeader) {
    const allowedOrigin = originHeader || "";
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Set-Cookie");
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

  function verifyAuth(req) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return null;
    try {
      const jwt = require("jsonwebtoken");
      const secret = process.env.JWT_SECRET || "changeme";
      return jwt.verify(token, secret);
    } catch {
      return null;
    }
  }

  setCors(res, req.headers.origin || "");
  if (req.method === "OPTIONS") {
    setCors(res, req.headers.origin || "");
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ success: true, data: [] });
  }

  if (req.method === "POST") {
    const user = verifyAuth(req);
    if (!user) return unauthorized(res);
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const product = {
      id: Date.now().toString(),
      name: body.name || "",
      price: Number(body.price || 0),
      stock: Number(body.stock || 0),
    };
    return res.status(201).json({ success: true, data: product });
  }

  return methodNotAllowed(res);
}
