import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SaleReportItem = {
  productId: string | null;
  productName: string | null;
  category?: string | null;
  quantity: number;
  price: number;
  lineTotal?: number;
};

type ReportSale = {
  total: Prisma.Decimal;
  createdAt: Date | null;
  items: Prisma.JsonValue | null;
};

type ReportPurchase = {
  createdAt: Date | null;
  date: Date;
  quantity: number;
  costPrice: Prisma.Decimal;
};

function inDateRange(value: Date | null | undefined, from?: Date, to?: Date) {
  if (!value) {
    return false;
  }

  if (from && value < from) {
    return false;
  }

  if (to && value > to) {
    return false;
  }

  return true;
}

function parseSaleItems(value: Prisma.JsonValue | null): {
  paymentMethod: string | null;
  items: SaleReportItem[];
} {
  if (Array.isArray(value)) {
    return {
      paymentMethod: null,
      items: value as SaleReportItem[]
    };
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as {
      paymentMethod?: unknown;
      items?: unknown;
    };

    return {
      paymentMethod:
        typeof record.paymentMethod === "string" ? record.paymentMethod : null,
      items: Array.isArray(record.items) ? (record.items as SaleReportItem[]) : []
    };
  }

  return {
    paymentMethod: null,
    items: []
  };
}

export async function getSummaryMetrics(from?: Date, to?: Date) {
  const sales = (await prisma.sale.findMany({
    where: {
      deletedAt: null,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {})
            }
          }
        : {})
    }
  })) as unknown as ReportSale[];

  let totalSales = 0;
  let itemsSold = 0;
  let cashSales = 0;
  let posSales = 0;
  let transferSales = 0;

  for (const sale of sales) {
    const saleTotal = sale.total.toNumber();
    const parsed = parseSaleItems(sale.items);

    totalSales += saleTotal;
    itemsSold += parsed.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);

    if (parsed.paymentMethod === "cash") {
      cashSales += saleTotal;
    } else if (parsed.paymentMethod === "pos") {
      posSales += saleTotal;
    } else if (parsed.paymentMethod === "transfer") {
      transferSales += saleTotal;
    }
  }

  return {
    totalSales: new Prisma.Decimal(totalSales),
    transactions: BigInt(sales.length),
    itemsSold: BigInt(itemsSold),
    cashSales: new Prisma.Decimal(cashSales),
    posSales: new Prisma.Decimal(posSales),
    transferSales: new Prisma.Decimal(transferSales)
  };
}

export async function getDailySales(from?: Date, to?: Date) {
  const sales = (await prisma.sale.findMany({
    where: {
      deletedAt: null,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {})
            }
          }
        : {})
    },
    orderBy: [{ createdAt: "asc" }]
  })) as unknown as ReportSale[];

  const daily = new Map<
    string,
    {
      day: Date;
      totalSales: number;
      transactions: number;
      itemsSold: number;
    }
  >();

  for (const sale of sales) {
    if (!sale.createdAt) {
      continue;
    }

    const dayKey = sale.createdAt.toISOString().slice(0, 10);
    const current =
      daily.get(dayKey) ??
      {
        day: new Date(`${dayKey}T00:00:00.000Z`),
        totalSales: 0,
        transactions: 0,
        itemsSold: 0
      };

    const parsed = parseSaleItems(sale.items);
    current.totalSales += sale.total.toNumber();
    current.transactions += 1;
    current.itemsSold += parsed.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
    daily.set(dayKey, current);
  }

  return Array.from(daily.values()).map((row) => ({
    day: row.day,
    totalSales: new Prisma.Decimal(row.totalSales),
    transactions: BigInt(row.transactions),
    itemsSold: BigInt(row.itemsSold)
  }));
}

export async function getProductSales(from?: Date, to?: Date) {
  const sales = (await prisma.sale.findMany({
    where: {
      deletedAt: null,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {})
            }
          }
        : {})
    }
  })) as unknown as ReportSale[];

  const totals = new Map<
    string,
    {
      productId: string;
      productName: string;
      category: string;
      quantitySold: number;
      revenue: number;
    }
  >();

  for (const sale of sales) {
    const parsed = parseSaleItems(sale.items);

    for (const item of parsed.items) {
      if (!item.productId) {
        continue;
      }

      const current =
        totals.get(item.productId) ??
        {
          productId: item.productId,
          productName: item.productName ?? item.productId,
          category: item.category ?? "Uncategorized",
          quantitySold: 0,
          revenue: 0
        };

      const quantity = Number(item.quantity ?? 0);
      const lineTotal =
        typeof item.lineTotal === "number"
          ? item.lineTotal
          : Number(item.price ?? 0) * quantity;

      current.quantitySold += quantity;
      current.revenue += lineTotal;
      totals.set(item.productId, current);
    }
  }

  return Array.from(totals.values())
    .sort((a, b) => b.revenue - a.revenue || b.quantitySold - a.quantitySold)
    .map((row) => ({
      ...row,
      quantitySold: BigInt(row.quantitySold),
      revenue: new Prisma.Decimal(row.revenue)
    }));
}

export async function getCategorySales(from?: Date, to?: Date) {
  const productSales = await getProductSales(from, to);
  const grouped = new Map<string, { quantitySold: number; revenue: number }>();

  for (const row of productSales) {
    const current = grouped.get(row.category) ?? { quantitySold: 0, revenue: 0 };
    current.quantitySold += Number(row.quantitySold);
    current.revenue += row.revenue?.toNumber?.() ?? 0;
    grouped.set(row.category, current);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue || b[1].quantitySold - a[1].quantitySold)
    .map(([category, values]) => ({
      category,
      quantitySold: BigInt(values.quantitySold),
      revenue: new Prisma.Decimal(values.revenue)
    }));
}

export async function getPurchaseCost(from?: Date, to?: Date) {
  const purchases = (await prisma.purchase.findMany()) as unknown as ReportPurchase[];
  const total = purchases
    .filter((purchase) => inDateRange(purchase.createdAt ?? purchase.date, from, to))
    .reduce(
      (sum, purchase) => sum + purchase.quantity * purchase.costPrice.toNumber(),
      0
    );

  return new Prisma.Decimal(total);
}

export async function getExpenseTotal(from?: Date, to?: Date) {
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {})
              }
            }
          : {})
      }
    });

    return expenses.reduce(
      (sum, expense) => sum.add(expense.amount),
      new Prisma.Decimal(0)
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      return new Prisma.Decimal(0);
    }

    throw error;
  }
}
