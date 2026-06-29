export function generateReceiptNumber() {
  const randomPart = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `RCT-${randomPart}`;
}
