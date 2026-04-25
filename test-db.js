import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

console.log("DATABASE_URL =", process.env.DATABASE_URL);

async function test() {
  try {
    console.log("⏳ Connecting...");

    const db = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: true
      }
    });

    console.log("✅ Connected!");

    const [rows] = await db.execute("SELECT * FROM products");

    console.log("Products:", rows.length);
    console.log(rows);

    await db.end();
  } catch (err) {
    console.error("❌ ERROR:");
    console.error(err);
  }
}

test();