import { jwtVerify } from "jose";
import { createCheckoutSale, PosDataError } from "../src/lib/pos-data.js";

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

function validateCheckoutBody(body) {
  const paymentMethod = String(body.paymentMethod || "").trim();
  const idempotencyKey = String(body.idempotencyKey || "").trim();
  const items = Array.isArray(body.items) ? body.items : [];

  if (!["cash", "pos", "transfer"].includes(paymentMethod)) {
    throw createHttpError(400, "paymentMethod must be cash, pos, or transfer.");
  }

  if (idempotencyKey.length < 8) {
    throw createHttpError(400, "idempotencyKey must be at least 8 characters long.");
  }

  if (items.length === 0) {
    throw createHttpError(400, "At least one checkout item is required.");
  }

  const normalizedItems = items.map((item, index) => {
    const productId = String(item?.productId || "").trim();
    const quantity = Number(item?.quantity);

    if (!productId) {
      throw createHttpError(400, `items[${index}].productId is required.`);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw createHttpError(400, `items[${index}].quantity must be a positive integer.`);
    }

    return { productId, quantity };
  });

  return {
    paymentMethod,
    idempotencyKey,
    items: normalizedItems
  };
}

function serializeSale(sale) {
  return {
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    total: Number(sale.total),
    paymentMethod: sale.paymentMethod,
    createdAt: sale.createdAt,
    idempotencyKey: sale.idempotencyKey,
    items: sale.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: Number(item.price),
      lineTotal: Number(item.lineTotal ?? Number(item.price) * item.quantity)
    }))
  };
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  let parsedBody;

  try {
    await requireAuth(req, ["admin", "cashier"]);
    parsedBody = await readJsonBody(req);
    const body = validateCheckoutBody(parsedBody);

    console.log("[api/checkout] Creating checkout transaction");

    const result = await createCheckoutSale(body);

    console.log("[api/checkout] Checkout transaction created successfully");

    return res.status(result.idempotentReplay ? 200 : 201).json({
      success: true,
      data: serializeSale(result.sale),
      meta: { idempotentReplay: result.idempotentReplay }
    });
  } catch (error) {
    console.error("[api/checkout] Failed to save checkout transaction", error);

    return res.status(error?.statusCode || 500).json({
      success: false,
      error: {
        code: error?.code || "INTERNAL_SERVER_ERROR",
        message: error?.message || "Failed to save checkout transaction."
      }
    });
  }
}
