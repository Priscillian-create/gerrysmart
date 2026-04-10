export default function handler(req, res) {
  const location = "/api/products";
  res.statusCode = 308;
  res.setHeader("Location", location);
  res.end();
}
