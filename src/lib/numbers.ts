import { Prisma } from "@prisma/client";

export function toNumber(value: Prisma.Decimal | number | string | bigint | null) {
  if (value === null) {
    return 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

export function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}
