const SUPPORTED_BARCODE_FORMATS = ["CODE128", "EAN13", "EAN8", "UPC", "QR"] as const;

type BarcodeFormat = (typeof SUPPORTED_BARCODE_FORMATS)[number];

export type BarcodeValidationResult = {
  valid: boolean;
  message?: string;
  value: string;
  format: BarcodeFormat;
};

function sanitizeAlphaNumeric(value: unknown) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function inferBarcodeFormat(value: unknown): BarcodeFormat {
  const raw = String(value || "").trim();
  if (/^\d{13}$/.test(raw)) return "EAN13";
  if (/^\d{8}$/.test(raw)) return "EAN8";
  if (/^\d{12}$/.test(raw)) return "UPC";
  return "CODE128";
}

export function normalizeBarcodeFormat(format: unknown, value: unknown = ""): BarcodeFormat {
  const candidate = String(format || "").trim().toUpperCase();
  const inferred = inferBarcodeFormat(value);

  if (candidate === "CODE128" && inferred !== "CODE128") {
    return inferred;
  }

  if ((SUPPORTED_BARCODE_FORMATS as readonly string[]).includes(candidate)) {
    return candidate as BarcodeFormat;
  }

  return inferred;
}

export function normalizeBarcodeValue(value: unknown, format: unknown = "UPC") {
  const resolvedFormat = normalizeBarcodeFormat(format, value);
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (resolvedFormat === "QR") return raw;
  if (resolvedFormat === "EAN13" || resolvedFormat === "EAN8" || resolvedFormat === "UPC") {
    return raw.replace(/\D/g, "");
  }

  return sanitizeAlphaNumeric(raw);
}

export function validateBarcodeValue(value: unknown, format: unknown = "UPC"): BarcodeValidationResult {
  const resolvedFormat = normalizeBarcodeFormat(format, value);
  const normalizedValue = normalizeBarcodeValue(value, resolvedFormat);

  if (!normalizedValue) {
    return {
      valid: false,
      message: "Barcode value is required.",
      value: normalizedValue,
      format: resolvedFormat
    };
  }

  if (resolvedFormat === "EAN13" && !/^\d{13}$/.test(normalizedValue)) {
    return {
      valid: false,
      message: "EAN13 barcodes must contain exactly 13 digits.",
      value: normalizedValue,
      format: resolvedFormat
    };
  }

  if (resolvedFormat === "EAN8" && !/^\d{8}$/.test(normalizedValue)) {
    return {
      valid: false,
      message: "EAN8 barcodes must contain exactly 8 digits.",
      value: normalizedValue,
      format: resolvedFormat
    };
  }

  if (resolvedFormat === "UPC" && !/^\d{12}$/.test(normalizedValue)) {
    return {
      valid: false,
      message: "UPC barcodes must contain exactly 12 digits.",
      value: normalizedValue,
      format: resolvedFormat
    };
  }

  if (resolvedFormat === "CODE128" && !/^[A-Z0-9]{6,100}$/.test(normalizedValue)) {
    return {
      valid: false,
      message: "CODE128 barcodes must be 6-100 characters using letters and numbers only.",
      value: normalizedValue,
      format: resolvedFormat
    };
  }

  return {
    valid: true,
    value: normalizedValue,
    format: resolvedFormat
  };
}

function calculateUpcCheckDigit(elevenDigits: string) {
  const digits = elevenDigits.replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  let oddSum = 0;
  let evenSum = 0;

  for (let index = 0; index < digits.length; index += 1) {
    const digit = Number(digits[index]) || 0;
    if (index % 2 === 0) oddSum += digit;
    else evenSum += digit;
  }

  return String((10 - ((oddSum * 3 + evenSum) % 10)) % 10);
}

export function generateBarcodeCandidate() {
  const randomPart = String(Math.floor(1000000000 + Math.random() * 9000000000)).padStart(10, "0");
  const body = `2${randomPart}`;
  return `${body}${calculateUpcCheckDigit(body)}`;
}
