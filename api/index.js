export default function handler(req, res) {
  function setCors(req, res) {
    const requestOrigin = req.headers.origin || "";

    res.setHeader("Vary", "Origin");
    if (requestOrigin) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    }
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
