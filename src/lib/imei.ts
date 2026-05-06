// IMEI / ICCID validation utilities.

export type IdKind = "imei" | "iccid" | "unknown";

const ONLY_DIGITS = /^\d+$/;

export function classify(raw: string): IdKind {
  const s = normalize(raw);
  if (!ONLY_DIGITS.test(s)) return "unknown";
  if (s.length === 15) return "imei";
  if (s.length === 19 || s.length === 20) return "iccid";
  return "unknown";
}

export function normalize(raw: string): string {
  return String(raw ?? "").replace(/\s+/g, "").trim();
}

// Luhn check digit verification — used for IMEI (15 digits) and ICCID (19/20 digits).
export function luhnValid(digits: string): boolean {
  if (!ONLY_DIGITS.test(digits) || digits.length < 2) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export interface ValidationResult {
  raw: string;
  value: string;
  kind: IdKind;
  valid: boolean;
  reason?: string;
}

export function validate(raw: string): ValidationResult {
  const value = normalize(raw);
  if (!value) return { raw, value, kind: "unknown", valid: false, reason: "empty" };
  const kind = classify(value);
  if (kind === "unknown") {
    return { raw, value, kind, valid: false, reason: `unexpected length ${value.length}` };
  }
  const valid = luhnValid(value);
  return { raw, value, kind, valid, reason: valid ? undefined : "luhn check failed" };
}
