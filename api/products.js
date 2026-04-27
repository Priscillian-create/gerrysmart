import { createProduct, listProducts, PosDataError } from "../src/lib/pos-data.js";

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
  return res.status(405).json({ success: false, message: "Method Not Allowed" });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw new PosDataError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

function normalizeProductPayload(body) {
  const name = String(body.name ?? "").trim();
  const category = String(body.category ?? "").trim();
  const price = Number(body.price);
  const stock = body.stock === undefined ? 0 : Number(body.stock);
  const barcode = String(body.barcode ?? "").trim() || null;
  const expiryDateValue = String(body.expiryDate ?? "").trim();

  if (!name) {
    throw new PosDataError(400, "VALIDATION_ERROR", "Product name is required.");
  }

  if (!category) {
    throw new PosDataError(400, "VALIDATION_ERROR", "Product category is required.");
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new PosDataError(
      400,
      "VALIDATION_ERROR",
      "Product price must be greater than zero."
    );
  }

  if (!Number.isInteger(stock) || stock < 0) {
    throw new PosDataError(
      400,
      "VALIDATION_ERROR",
      "Product stock must be a non-negative integer."
    );
  }

  let expiryDate = null;

  if (expiryDateValue) {
    const parsed = new Date(expiryDateValue);

    if (Number.isNaN(parsed.getTime())) {
      throw new PosDataError(400, "VALIDATION_ERROR", "Expiry date must be valid.");
    }

    expiryDate = parsed.toISOString().slice(0, 10);
  }

  return {
    name,
    category,
    price,
    stock,
    barcode,
    expiryDate
  };
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const products = await listProducts({
        category: String(req.query?.category ?? "").trim() || undefined,
        search: String(req.query?.search ?? "").trim() || undefined
      });

      console.log(`[api/products] Returned ${products.length} products`);

      return res.status(200).json({ success: true, data: products });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const product = await createProduct(normalizeProductPayload(body));

      console.log("[api/products] Product created", { id: product.id, name: product.name });

      return res.status(201).json({ success: true, data: product });
    }

    return methodNotAllowed(res);
  } catch (error) {
    console.error("[api/products] Failed to handle request", error);

    return res.status(error?.statusCode || 500).json({
      success: false,
      error: {
        code: error?.code || "INTERNAL_SERVER_ERROR",
        message: error?.message || "Failed to handle product request."
      }
    });
  }
}
