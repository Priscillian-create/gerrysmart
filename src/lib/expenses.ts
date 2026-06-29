import { prisma } from "@/lib/prisma";

let ensureExpenseTablePromise: Promise<void> | null = null;

export function ensureExpenseTable() {
  ensureExpenseTablePromise ??= prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expenses (
      id CHAR(36) NOT NULL,
      description VARCHAR(191) NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      date DATETIME(3) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX expenses_category_idx (category),
      INDEX expenses_date_idx (date)
    )
  `).then(() => undefined);

  return ensureExpenseTablePromise;
}
