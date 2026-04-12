import mysql from "mysql2/promise";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function methodNotAllowed(res) {
  return res
    .status(405)
    .json({ success: false, message: "Method Not Allowed" });
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const normalizedUrl = new URL(databaseUrl);
  normalizedUrl.searchParams.delete("sslaccept");

  return normalizedUrl.toString();
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return methodNotAllowed(res);
  }

  let db;

  try {
    const databaseUrl = getDatabaseUrl();

    console.log("[api/products] Connecting to TiDB with SSL");

    db = await mysql.createConnection({
      uri: databaseUrl,
      ssl: {
        rejectUnauthorized: true
      }
    });

    console.log("[api/products] Database connection established");

    const [rows] = await db.query("SELECT * FROM products;");

    console.log(`[api/products] Returned ${rows.length} products`);

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("[api/products] Failed to load products", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load products"
    });
  } finally {
    if (db) {
      await db.end();
    }
  }
}
