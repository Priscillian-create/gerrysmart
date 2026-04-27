import { listSales, PosDataError } from "../src/lib/pos-data.js";

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

function parseDateParam(value, endOfDay = false) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw new PosDataError(400, "INVALID_DATE", "Invalid sales date filter.");
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return methodNotAllowed(res);
  }

  try {
    const from =
      parseDateParam(req.query?.from) || parseDateParam(req.query?.start);
    const to = parseDateParam(req.query?.to, true) || parseDateParam(req.query?.end, true);

    if (from && to && from > to) {
      throw new PosDataError(
        400,
        "INVALID_DATE_RANGE",
        "The start date must be before the end date."
      );
    }

    const sales = await listSales({ from, to });

    console.log(`[api/sales] Returned ${sales.length} sales`);

    return res.status(200).json({
      success: true,
      data: sales,
      meta: {
        count: sales.length,
        range: { from, to }
      }
    });
  } catch (error) {
    console.error("[api/sales] Failed to load sales", error);

    return res.status(error?.statusCode || 500).json({
      success: false,
      error: {
        code: error?.code || "INTERNAL_SERVER_ERROR",
        message: error?.message || "Failed to load sales."
      }
    });
  }
}
