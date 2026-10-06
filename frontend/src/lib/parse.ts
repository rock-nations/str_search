/**
 * Turns what a person typed into a number, or null when it isn't one.
 * Accepts "$650,000", "6.99%", " 1 200 ", "−5" and plain numbers.
 */
export function parseNumber(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (raw === null || raw === undefined) return null;
  const cleaned = raw
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/[\s,$%_]/g, "");
  if (cleaned === "") return null;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function isBlank(raw: string | null | undefined): boolean {
  return raw === null || raw === undefined || raw.trim() === "";
}

/** 6.99 → "0.0699". Rounds away float noise before it reaches the API. */
export function percentToFraction(percent: number): string {
  return String(Number((percent / 100).toFixed(8)));
}

/** 0.0699 → "6.99". */
export function fractionToPercent(fraction: number | null | undefined): string {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return "";
  return String(Number((fraction * 100).toFixed(6)));
}

/** Money to the string the API expects, at most two decimals. */
export function moneyToString(value: number): string {
  return String(Math.round(value * 100) / 100);
}
