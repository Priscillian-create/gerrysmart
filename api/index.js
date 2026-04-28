export default function handler(req, res) {
  function parseOriginList(rawValue) {
    if (!rawValue) return [];

    return String(rawValue)
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  function getAllowedOrigins() {
    const origins = new Set([
      "http://localhost:4000",
      "https://pgerry.netlify.app"
    ]);

    for (const origin of parseOriginList(process.env.CORS_ORIGINS)) {
      origins.add(origin);
    }

    return Array.from(origins);
  }

  function setCors(req, res) {
    const requestOrigin = req.headers.origin || "";
    const allowedOrigin = getAllowedOrigins().includes(requestOrigin)
      ? requestOrigin
      : "";

    res.setHeader("Vary", "Origin");
    if (allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Set-Cookie");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const location = "/api/products";
  res.statusCode = 308;
  res.setHeader("Location", location);
  res.end();
}
