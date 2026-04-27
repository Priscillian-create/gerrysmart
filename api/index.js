export default function handler(req, res) {
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
