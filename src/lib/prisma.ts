import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getPrismaDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return undefined;
  }

  try {
    const normalizedUrl = new URL(databaseUrl);

    if (/tidbcloud\.com$/i.test(normalizedUrl.hostname)) {
      normalizedUrl.searchParams.set("sslaccept", "strict");
    }

    return normalizedUrl.toString();
  } catch {
    return databaseUrl;
  }
}

const prismaDatabaseUrl = getPrismaDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(prismaDatabaseUrl
      ? {
          datasources: {
            db: {
              url: prismaDatabaseUrl
            }
          }
        }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
