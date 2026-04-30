const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:4000",
  "https://pgerry.netlify.app"
];

function parseOriginList(rawValue: string | undefined) {
  if (!rawValue) return [];

  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function getAllowedOrigins() {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS);

  for (const origin of parseOriginList(process.env.CORS_ORIGINS)) {
    origins.add(origin);
  }

  return Array.from(origins);
}

export function resolveAllowedOrigin(origin: string | null) {
  if (!origin) {
    return null;
  }

  return getAllowedOrigins().includes(origin) ? origin : null;
}

export function buildCorsHeaders(origin: string | null) {
  const headers = new Headers();

  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return headers;
}

export function applyCorsHeaders(headers: Headers, origin: string | null) {
  buildCorsHeaders(origin).forEach((value, key) => {
    headers.set(key, value);
  });
}
