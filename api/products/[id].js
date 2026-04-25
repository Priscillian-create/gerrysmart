import { jwtVerify } from "jose";
import { PosDataError, updateProduct } from "../../src/lib/pos-data.js";

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

function createHttpError(statusCode, message) {
  const error = new PosDataError(statusCode, "HTTP_ERROR", message);
  return error;
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
    throw createHttpError(400, "Request body must be valid JSON.");
  }
}

async function requireAuth(req, allowedRoles) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) {
    throw createHttpError(401, "Missing bearer token.");
  }

  if (!process.env.JWT_SECRET) {
    throw createHttpError(500, "JWT_SECRET is not configured.");
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    if (allowedRoles?.length && !allowedRoles.includes(payload.role)) {
      throw createHttpError(403, "You do not have access to this resource.");
    }

    return payload;
  } catch (error) {
    if (error?.statusCode) {
      throw error;
    }

    throw createHttpError(401, "Invalid bearer token.");
  }
}

function normalizeProductUpdate(body) {
  const data = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();

    if (!name) {
      throw createHttpError(400, "Product name is required.");
    }

    data.name = name;
  }

  if (body.category !== undefined) {
    const category = String(body.category).trim();

    if (!category) {
      throw createHttpError(400, "Product category is required.");
    }

    data.category = category;
  }

  if (body.price !== undefined) {
    const price = Number(body.price);

    if (!Number.isFinite(price) || price <= 0) {
      throw createHttpError(400, "Product price must be greater than zero.");
    }

    data.price = price;
  }

  if (body.stock !== undefined) {
    const stock = Number(body.stock);

    if (!Number.isInteger(stock) || stock < 0) {
      throw createHttpError(400, "Product stock must be a non-negative integer.");
    }

    data.stock = stock;
  }

  if (body.barcode !== undefined) {
    const barcode = String(body.barcode || "").trim();
    data.barcode = barcode || null;
  }

  if (body.expiryDate !== undefined) {
    if (!body.expiryDate) {
      data.expiryDate = null;
    } else {
      const expiryDate = new Date(body.expiryDate);

      if (Number.isNaN(expiryDate.getTime())) {
        throw createHttpError(400, "Product expiryDate must be a valid date.");
      }

      data.expiryDate = expiryDate;
    }
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError(400, "Provide at least one field to update.");
  }

  return data;
}

function serializeProduct(product) {
  return {
    ...product,
    price: Number(product.price)
  };
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "PUT") {
    return methodNotAllowed(res);
  }

  try {
    await requireAuth(req, ["admin"]);

    const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;

    if (!id) {
      throw createHttpError(400, "Product id is required.");
    }

    const body = await readJsonBody(req);
    const data = normalizeProductUpdate(body);

    console.log(`[api/products/${id}] Updating product`);

    const product = await updateProduct(id, data);

    console.log(`[api/products/${id}] Product updated successfully`);

    return res.status(200).json({
      success: true,
      data: serializeProduct(product)
    });
  } catch (error) {
    console.error("[api/products/[id]] Failed to update product", error);

    return res.status(error?.statusCode || 500).json({
      success: false,
      error: {
        code: error?.code || "INTERNAL_SERVER_ERROR",
        message: error?.message || "Failed to update product."
      }
    });
  }
}
