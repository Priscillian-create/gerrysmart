import crypto from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__vercelCheckoutPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__vercelCheckoutPrisma = prisma;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
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

function generateReceiptNumber() {
  return `RCT-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

function normalizeUserId(subject) {
  if (typeof subject !== "string") {
    return null;
  }

  const value = subject.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
    ? value
    : null;
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
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      price: Number(item.price),
      lineTotal: Number(item.price) * item.quantity
    }))
  };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  let parsedBody;

  try {
    const auth = await requireAuth(req, ["admin", "cashier"]);
    parsedBody = await readJsonBody(req);
    const body = validateCheckoutBody(parsedBody);

    console.log("[api/checkout] Creating checkout transaction");

    const groupedItems = Array.from(
      body.items.reduce((map, item) => {
        const current = map.get(item.productId) ?? 0;
        map.set(item.productId, current + item.quantity);
        return map;
      }, new Map())
    ).map(([productId, quantity]) => ({ productId, quantity }));

    const existingSale = await prisma.sale.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (existingSale) {
      console.log("[api/checkout] Replaying existing checkout transaction");

      return res.status(200).json({
        success: true,
        data: serializeSale(existingSale),
        meta: { idempotentReplay: true }
      });
    }

    const sale = await prisma.$transaction(
      async (tx) => {
        const duplicate = await tx.sale.findUnique({
          where: { idempotencyKey: body.idempotencyKey },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });

        if (duplicate) {
          return duplicate;
        }

        const products = await tx.product.findMany({
          where: {
            id: {
              in: groupedItems.map((item) => item.productId)
            }
          }
        });

        if (products.length !== groupedItems.length) {
          throw createHttpError(404, "One or more products do not exist.");
        }

        const productMap = new Map(products.map((product) => [product.id, product]));
        let total = 0;

        for (const item of groupedItems) {
          const product = productMap.get(item.productId);

          if (!product) {
            throw createHttpError(404, "One or more products do not exist.");
          }

          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: {
                gte: item.quantity
              }
            },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });

          if (updated.count === 0) {
            throw createHttpError(409, `Insufficient stock for product ${product.name}.`);
          }

          total += Number(product.price) * item.quantity;
        }

        return tx.sale.create({
          data: {
            total,
            paymentMethod: body.paymentMethod,
            idempotencyKey: body.idempotencyKey,
            receiptNumber: generateReceiptNumber(),
            userId: normalizeUserId(auth.sub),
            items: {
              create: groupedItems.map((item) => {
                const product = productMap.get(item.productId);

                return {
                  productId: item.productId,
                  quantity: item.quantity,
                  price: product.price
                };
              })
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );

    console.log("[api/checkout] Checkout transaction created successfully");

    return res.status(201).json({
      success: true,
      data: serializeSale(sale),
      meta: { idempotentReplay: false }
    });
  } catch (error) {
    console.error("[api/checkout] Failed to save checkout transaction", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const idempotencyKey = String(parsedBody?.idempotencyKey || "").trim();

      if (idempotencyKey) {
        const duplicate = await prisma.sale.findUnique({
          where: { idempotencyKey },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });

        if (duplicate) {
          return res.status(200).json({
            success: true,
            data: serializeSale(duplicate),
            meta: { idempotentReplay: true }
          });
        }
      }
    }

    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || "Failed to save checkout transaction."
    });
  }
}
