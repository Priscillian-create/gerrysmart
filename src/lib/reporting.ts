import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function dateFilter(column: string, from?: Date, to?: Date) {
  const columnRef = Prisma.raw(column);

  if (from && to) {
    return Prisma.sql`AND ${columnRef} >= ${from} AND ${columnRef} <= ${to}`;
  }

  if (from) {
    return Prisma.sql`AND ${columnRef} >= ${from}`;
  }

  if (to) {
    return Prisma.sql`AND ${columnRef} <= ${to}`;
  }

  return Prisma.empty;
}

export async function getSummaryMetrics(from?: Date, to?: Date) {
  const result = await prisma.$queryRaw<
    Array<{
      totalSales: Prisma.Decimal | null;
      transactions: bigint;
      itemsSold: bigint | null;
      cashSales: Prisma.Decimal | null;
      posSales: Prisma.Decimal | null;
      transferSales: Prisma.Decimal | null;
    }>
  >(Prisma.sql`
    SELECT
      COALESCE(SUM(s.total), 0) AS totalSales,
      COUNT(*) AS transactions,
      COALESCE(SUM(si.quantity), 0) AS itemsSold,
      COALESCE(SUM(CASE WHEN s.paymentMethod = 'cash' THEN s.total ELSE 0 END), 0) AS cashSales,
      COALESCE(SUM(CASE WHEN s.paymentMethod = 'pos' THEN s.total ELSE 0 END), 0) AS posSales,
      COALESCE(SUM(CASE WHEN s.paymentMethod = 'transfer' THEN s.total ELSE 0 END), 0) AS transferSales
    FROM Sale s
    LEFT JOIN SaleItem si ON si.saleId = s.id
    WHERE s.deletedAt IS NULL
    ${dateFilter("s.createdAt", from, to)}
  `);

  return result[0];
}

export async function getDailySales(from?: Date, to?: Date) {
  return prisma.$queryRaw<
    Array<{
      day: Date;
      totalSales: Prisma.Decimal | null;
      transactions: bigint;
      itemsSold: bigint | null;
    }>
  >(Prisma.sql`
    SELECT
      DATE(s.createdAt) AS day,
      COALESCE(SUM(s.total), 0) AS totalSales,
      COUNT(DISTINCT s.id) AS transactions,
      COALESCE(SUM(si.quantity), 0) AS itemsSold
    FROM Sale s
    LEFT JOIN SaleItem si ON si.saleId = s.id
    WHERE s.deletedAt IS NULL
    ${dateFilter("s.createdAt", from, to)}
    GROUP BY DATE(s.createdAt)
    ORDER BY day ASC
  `);
}

export async function getProductSales(from?: Date, to?: Date) {
  return prisma.$queryRaw<
    Array<{
      productId: string;
      productName: string;
      category: string;
      quantitySold: bigint;
      revenue: Prisma.Decimal | null;
    }>
  >(Prisma.sql`
    SELECT
      p.id AS productId,
      p.name AS productName,
      p.category AS category,
      COALESCE(SUM(si.quantity), 0) AS quantitySold,
      COALESCE(SUM(si.quantity * si.price), 0) AS revenue
    FROM SaleItem si
    INNER JOIN Sale s ON s.id = si.saleId AND s.deletedAt IS NULL
    INNER JOIN Product p ON p.id = si.productId
    WHERE 1 = 1
    ${dateFilter("s.createdAt", from, to)}
    GROUP BY p.id, p.name, p.category
    ORDER BY revenue DESC, quantitySold DESC
  `);
}

export async function getCategorySales(from?: Date, to?: Date) {
  return prisma.$queryRaw<
    Array<{
      category: string;
      quantitySold: bigint;
      revenue: Prisma.Decimal | null;
    }>
  >(Prisma.sql`
    SELECT
      p.category AS category,
      COALESCE(SUM(si.quantity), 0) AS quantitySold,
      COALESCE(SUM(si.quantity * si.price), 0) AS revenue
    FROM SaleItem si
    INNER JOIN Sale s ON s.id = si.saleId AND s.deletedAt IS NULL
    INNER JOIN Product p ON p.id = si.productId
    WHERE 1 = 1
    ${dateFilter("s.createdAt", from, to)}
    GROUP BY p.category
    ORDER BY revenue DESC, quantitySold DESC
  `);
}

export async function getPurchaseCost(from?: Date, to?: Date) {
  const result = await prisma.$queryRaw<Array<{ totalCost: Prisma.Decimal | null }>>(Prisma.sql`
    SELECT COALESCE(SUM(quantity * unitCost), 0) AS totalCost
    FROM Purchase
    WHERE 1 = 1
    ${dateFilter("createdAt", from, to)}
  `);

  return result[0]?.totalCost ?? 0;
}

export async function getExpenseTotal(from?: Date, to?: Date) {
  const result = await prisma.$queryRaw<Array<{ totalExpenses: Prisma.Decimal | null }>>(Prisma.sql`
    SELECT COALESCE(SUM(amount), 0) AS totalExpenses
    FROM Expense
    WHERE 1 = 1
    ${dateFilter("date", from, to)}
  `);

  return result[0]?.totalExpenses ?? 0;
}
