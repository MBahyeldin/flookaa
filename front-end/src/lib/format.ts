import { intlLocale, t } from "@/i18n";

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>(
  kind: string,
  options: object,
  make: (locale: string) => T,
): T {
  const locale = intlLocale();
  const key = `${locale}|${kind}|${JSON.stringify(options)}`;
  let f = cache.get(key) as T | undefined;
  if (!f) {
    f = make(locale);
    cache.set(key, f);
  }
  return f;
}

export function numberFormat(options: Intl.NumberFormatOptions = {}) {
  return cached("n", options, (l) => new Intl.NumberFormat(l, options));
}

export function dateFormat(options: Intl.DateTimeFormatOptions = {}) {
  return cached("d", options, (l) => new Intl.DateTimeFormat(l, options));
}

export function relativeFormat(options: Intl.RelativeTimeFormatOptions = { numeric: "auto" }) {
  return cached("r", options, (l) => new Intl.RelativeTimeFormat(l, options));
}

export function formatNumber(n: number): string {
  return numberFormat().format(n);
}

/** "1.2k" */
export function formatCompact(n: number): string {
  return numberFormat({ notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function toDate(value: string | number | Date): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | number | Date): string {
  const date = toDate(value);
  if (!date) return "";
  return dateFormat({
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/** "16 Mar 2026" */
export function formatDateOnly(value: string | number | Date): string {
  const date = toDate(value);
  return date ? dateFormat({ year: "numeric", month: "short", day: "numeric" }).format(date) : "";
}

/** "March 2026" */
export function formatMonthYear(value: string | number | Date, month: "long" | "short" = "long"): string {
  const date = toDate(value);
  return date ? dateFormat({ month, year: "numeric" }).format(date) : "";
}

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/** "2 hours ago"; pair it with `formatDate` in a `title` so the exact time stays available. */
export function formatRelativeDate(value: string | number | Date): string {
  const date = toDate(value);
  if (!date) return "";
  let duration = (date.getTime() - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeFormat().format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return formatDateOnly(date);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "now", "2m", "5h", "Tue", "Oct 12", or "Oct 12, 2025" in another year. */
export function shortTime(value: string, now = Date.now()): string {
  const date = toDate(value);
  if (!date) return "";
  const ago = now - date.getTime();
  if (ago < MINUTE) return t("common:time.now");
  if (ago < HOUR) return t("common:time.minutes", { n: formatNumber(Math.floor(ago / MINUTE)) });
  if (ago < DAY) return t("common:time.hours", { n: formatNumber(Math.floor(ago / HOUR)) });
  if (ago < 7 * DAY) return dateFormat({ weekday: "short" }).format(date);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return dateFormat({ month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).format(date);
}

export type DateGroup = "today" | "week" | "earlier";

/** Today = since local midnight; this week = the 7 days before that. */
export function dateGroup(value: string, now = new Date()): DateGroup {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ms = new Date(value).getTime();
  if (ms >= midnight) return "today";
  if (ms >= midnight - 7 * DAY) return "week";
  return "earlier";
}
