/**
 * Number formatting used everywhere a figure is shown.
 * Negative values use a true minus sign (−) so columns of figures align.
 */
const MINUS = "−";

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});
const plain = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function withMinus(value: number, formatted: string) {
  return value < 0 ? `${MINUS}${formatted.replace("-", "")}` : formatted;
}

export const EMPTY = "—";

export function formatMoney(value: number | null | undefined, { cents = false } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  // Avoid "-$0" for tiny negative rounding noise.
  const v = Math.abs(value) < 0.005 ? 0 : value;
  return withMinus(v, (cents ? usd2 : usd0).format(v));
}

export function formatMoneyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return withMinus(value, usdCompact.format(value));
}

/** Formats a fraction (0.366) as a percentage ("36.6%"). */
export function formatPercent(fraction: number | null | undefined, digits = 1): string {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return EMPTY;
  const rounded = Number((fraction * 100).toFixed(digits));
  if (rounded === 0) return `${(0).toFixed(digits)}%`;
  return `${rounded < 0 ? MINUS : ""}${Math.abs(rounded).toFixed(digits)}%`;
}

/** Like formatPercent but always shows a sign: "+4.0%" / "−18.0%". */
export function formatSignedPercent(fraction: number | null | undefined, digits = 1): string {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return EMPTY;
  const rounded = Number((fraction * 100).toFixed(digits));
  if (rounded === 0) return `${(0).toFixed(digits)}%`;
  return `${rounded > 0 ? "+" : MINUS}${Math.abs(rounded).toFixed(digits)}%`;
}

/** Formats a percentage that is already in 0–100 units ("6.99" → "6.99%"). */
export function formatPctUnits(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return `${plain.format(value)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return withMinus(value, plain.format(value));
}

/** Money input display: thousands separators, no currency symbol. */
export function formatMoneyInput(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatRelativeTime(iso: string | Date, now = Date.now()): string {
  const time = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  if (!Number.isFinite(time)) return EMPTY;
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return relative.format(Math.round(seconds / 86_400), "day");
  return dateTime.format(time);
}

export function formatDateTime(iso: string): string {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? dateTime.format(time) : EMPTY;
}

export function formatHomeType(value: string | null | undefined): string {
  if (!value) return EMPTY;
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
