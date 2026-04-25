import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { Prisma, PrismaClient } from "@prisma/client";

const globalForPosPrisma = globalThis;
let mysqlPool;

function getPrismaDatabaseUrl() {
  ensureDatabaseConfigured();

  try {
    const normalizedUrl = new URL(process.env.DATABASE_URL);

    if (/tidbcloud\.com$/i.test(normalizedUrl.hostname)) {
      normalizedUrl.searchParams.set("sslaccept", "strict");
    }

    return normalizedUrl.toString();
  } catch {
    return process.env.DATABASE_URL;
  }
}

const prisma =
  globalForPosPrisma.posPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getPrismaDatabaseUrl()
      }
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPosPrisma.posPrisma = prisma;
}

export class PosDataError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "PosDataError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details ?? null;
  }
}

function ensureDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    throw new PosDataError(500, "DB_CONFIG_MISSING", "DATABASE_URL is not configured.");
  }
}

function getMysqlDatabaseUrl() {
  ensureDatabaseConfigured();

  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.delete("sslaccept");
  return databaseUrl.toString();
}

function getMysqlPool() {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      uri: getMysqlDatabaseUrl(),
      ssl: {
        rejectUnauthorized: true
      },
      waitForConnections: true,
      connectionLimit: 5
    });
  }

  return mysqlPool;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return Number(value);
}

function toDateOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new PosDataError(400, "INVALID_DATE", `Invalid date value: ${value}`);
  }

  return date;
}

function normalizeSaleItems(value) {
  let parsedValue = value;

  if (typeof value === "string" && value.trim().length > 0) {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      // Legacy rows may contain malformed JSON; treat them as empty instead of
      // breaking sales and reporting endpoints.
      parsedValue = null;
    }
  }

  if (Array.isArray(parsedValue)) {
    return {
      paymentMethod: null,
      items: parsedValue
    };
  }

  if (parsedValue && typeof parsedValue === "object") {
    return {
      paymentMethod:
        typeof parsedValue.paymentMethod === "string"
          ? parsedValue.paymentMethod
          : null,
      items: Array.isArray(parsedValue.items) ? parsedValue.items : []
    };
  }

  return {
    paymentMethod: null,
    items: []
  };
}

function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    };
  }

  return { value: error };
}

function logWriteFailure(operation, context, error) {
  console.error(`[pos-data] ${operation} failed`, {
    context,
    error: serializeError(error)
  });
}

function mapProduct(product) {
  return {
    id: product.id,
    name: product.name ?? "",
    category: product.category ?? "",
    price: toNumber(product.price),
    stock: Number(product.stock ?? 0),
    barcode: product.barcode ?? null,
    expiryDate: product.expiryDate ? product.expiryDate.toISOString().slice(0, 10) : null,
    status: product.status ?? "active",
    updatedAt: product.updatedAt ?? null
  };
}

function mapUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    password: user.password ?? null,
    role: user.role ?? "user"
  };
}

function mapSale(sale) {
  const { paymentMethod, items } = normalizeSaleItems(sale.items);

  return {
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    total: toNumber(sale.total),
    paymentMethod,
    createdAt: sale.createdAt ?? null,
    updatedAt: sale.updatedAt ?? null,
    deletedAt: sale.deletedAt ?? null,
    idempotencyKey: sale.clientSaleId ?? null,
    items: items.map((item) => ({
      productId: item.productId ?? null,
      productName: item.productName ?? null,
      quantity: Number(item.quantity ?? 0),
      price: toNumber(item.price),
      lineTotal: toNumber(item.lineTotal ?? toNumber(item.price) * Number(item.quantity ?? 0))
    }))
  };
}

async function fetchProductById(id) {
  const product = await prisma.product.findFirst({
    where: {
      id,
      deleted: {
        not: true
      }
    }
  });

  return product ? mapProduct(product) : null;
}

export async function listProducts(filters = {}) {
  ensureDatabaseConfigured();

  const products = await prisma.product.findMany({
    where: {
      deleted: {
        not: true
      },
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                name: {
                  contains: filters.search
                }
              },
              {
                barcode: {
                  contains: filters.search
                }
              }
            ]
          }
        : {})
    },
    orderBy: [{ stock: "asc" }, { name: "asc" }]
  });

  return products.map(mapProduct);
}

export async function createProduct(input) {
  ensureDatabaseConfigured();

  try {
    const product = await prisma.product.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name,
        category: input.category,
        price: input.price,
        stock: input.stock,
        barcode: input.barcode ?? null,
        expiryDate: toDateOnly(input.expiryDate),
        status: "active",
        deleted: false,
        deletedAt: null,
        stringId: null
      }
    });

    return mapProduct(product);
  } catch (error) {
    logWriteFailure("create product", { input }, error);
    throw error;
  }
}

export async function findUserByEmail(email) {
  ensureDatabaseConfigured();

  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const [user] = await prisma.$queryRaw`
    SELECT id, name, email, password, role
    FROM users
    WHERE LOWER(email) = LOWER(${normalizedEmail})
    LIMIT 1
  `;

  return mapUser(user ?? null);
}

export async function createUser(input) {
  ensureDatabaseConfigured();

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name ?? null,
        email: input.email,
        password: input.password,
        role: input.role
      }
    });

    return mapUser(user);
  } catch (error) {
    logWriteFailure("create user", { email: input.email }, error);
    throw error;
  }
}

export async function updateProduct(id, input) {
  ensureDatabaseConfigured();

  const data = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.category !== undefined) {
    data.category = input.category;
  }

  if (input.price !== undefined) {
    data.price = input.price;
  }

  if (input.stock !== undefined) {
    data.stock = input.stock;
  }

  if (input.barcode !== undefined) {
    data.barcode = input.barcode ?? null;
  }

  if (input.expiryDate !== undefined) {
    data.expiryDate = toDateOnly(input.expiryDate);
  }

  if (Object.keys(data).length === 0) {
    throw new PosDataError(400, "VALIDATION_ERROR", "Provide at least one field to update.");
  }

  const existing = await prisma.product.findFirst({
    where: {
      id,
      deleted: {
        not: true
      }
    }
  });

  if (!existing) {
    throw new PosDataError(404, "NOT_FOUND", "Product not found.");
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data
    });

    return mapProduct(product);
  } catch (error) {
    logWriteFailure("update product", { id, input }, error);
    throw error;
  }
}

export async function listSales(filters = {}) {
  ensureDatabaseConfigured();

  const sales = await prisma.sale.findMany({
    where: {
      deletedAt: null,
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {})
            }
          }
        : {})
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return sales.map(mapSale);
}

export async function softDeleteSale(id) {
  ensureDatabaseConfigured();

  const result = await prisma.sale.updateMany({
    where: {
      id,
      deletedAt: null
    },
    data: {
      deletedAt: new Date()
    }
  });

  if (result.count === 0) {
    throw new PosDataError(404, "NOT_FOUND", "Sale not found.");
  }
}

function buildReceiptNumber() {
  return `RCT-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export async function createCheckoutSale(input) {
  ensureDatabaseConfigured();
  const connection = await getMysqlPool().getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      `SELECT id, receipt_number, total, items, created_at, updated_at, deleted_at, client_sale_id
       FROM sales
       WHERE client_sale_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [input.idempotencyKey]
    );

    if (existingRows[0]) {
      await connection.rollback();
      return {
        sale: mapSale({
          id: existingRows[0].id,
          receiptNumber: existingRows[0].receipt_number,
          total: existingRows[0].total,
          items: existingRows[0].items,
          createdAt: existingRows[0].created_at,
          updatedAt: existingRows[0].updated_at,
          deletedAt: existingRows[0].deleted_at,
          clientSaleId: existingRows[0].client_sale_id
        }),
        idempotentReplay: true
      };
    }

    const groupedItems = Array.from(
      input.items.reduce((map, item) => {
        const current = map.get(item.productId) ?? 0;
        map.set(item.productId, current + item.quantity);
        return map;
      }, new Map())
    ).map(([productId, quantity]) => ({ productId, quantity }));

    const [productRows] = await connection.execute(
      `SELECT id, name, category, price, stock, barcode
       FROM products
       WHERE id IN (${groupedItems.map(() => "?").join(", ")})
         AND COALESCE(deleted, 0) = 0
       FOR UPDATE`,
      groupedItems.map((item) => item.productId)
    );

    if (productRows.length !== groupedItems.length) {
      throw new PosDataError(
        404,
        "PRODUCT_NOT_FOUND",
        "One or more products do not exist."
      );
    }

    const productMap = new Map(productRows.map((product) => [product.id, product]));
    let total = 0;

    const saleItems = groupedItems.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new PosDataError(
          404,
          "PRODUCT_NOT_FOUND",
          "One or more products do not exist."
        );
      }

      const currentStock = Number(product.stock ?? 0);

      if (currentStock < item.quantity) {
        throw new PosDataError(
          409,
          "INSUFFICIENT_STOCK",
          `Insufficient stock for product ${product.name ?? item.productId}.`
        );
      }

      const unitPrice = toNumber(product.price);
      const lineTotal = unitPrice * item.quantity;
      total += lineTotal;

      return {
        productId: product.id,
        productName: product.name ?? null,
        category: product.category ?? null,
        barcode: product.barcode ?? null,
        quantity: item.quantity,
        price: unitPrice,
        lineTotal
      };
    });

    for (const item of groupedItems) {
      const [result] = await connection.execute(
        `UPDATE products
         SET stock = stock - ?, updated_at = UTC_TIMESTAMP()
         WHERE id = ? AND COALESCE(deleted, 0) = 0 AND stock >= ?`,
        [item.quantity, item.productId, item.quantity]
      );

      if (result.affectedRows === 0) {
        const product = productMap.get(item.productId);
        throw new PosDataError(
          409,
          "INSUFFICIENT_STOCK",
          `Insufficient stock for product ${product?.name ?? item.productId}.`
        );
      }
    }

    const sale = {
      id: crypto.randomUUID(),
      receiptNumber: buildReceiptNumber(),
      total,
      items: {
        paymentMethod: input.paymentMethod,
        items: saleItems
      },
      clientSaleId: input.idempotencyKey,
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null
    };

    await connection.execute(
      `INSERT INTO sales (id, receipt_number, total, items, client_sale_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        sale.id,
        sale.receiptNumber,
        sale.total,
        JSON.stringify(sale.items),
        sale.clientSaleId
      ]
    );

    await connection.commit();

    return {
      sale: mapSale(sale),
      idempotentReplay: false
    };
  } catch (error) {
    await connection.rollback();
    logWriteFailure(
      "create checkout sale",
      {
        paymentMethod: input.paymentMethod,
        idempotencyKey: input.idempotencyKey,
        items: input.items
      },
      error
    );
    throw error;
  } finally {
    connection.release();
  }
}
