import { ApiError } from "@/lib/errors";

export function parseDateInput(value?: string, endOfDay = false) {
  if (!value) {
    return undefined;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
    : value;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "INVALID_DATE", `Invalid date value: ${value}`);
  }

  return date;
}

export function resolveDateRange(url: URL) {
  const fromParam = url.searchParams.get("from") ?? undefined;
  const toParam = url.searchParams.get("to") ?? undefined;

  const from = parseDateInput(fromParam);
  const to = parseDateInput(toParam, true);

  if (from && to && from > to) {
    throw new ApiError(400, "INVALID_DATE_RANGE", "The from date must be before the to date.");
  }

  if (from || to) {
    return { from, to };
  }

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return {
    from: startOfMonth,
    to: now
  };
}
