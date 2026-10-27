const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "now", "2m", "5h", "Tue", "Oct 12", or "Oct 12, 2025" in another year. */
export function shortTime(value: string, now = Date.now()): string {
  const date = new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return "";
  const ago = now - ms;
  if (ago < MINUTE) return "now";
  if (ago < HOUR) return `${Math.floor(ago / MINUTE)}m`;
  if (ago < DAY) return `${Math.floor(ago / HOUR)}h`;
  if (ago < 7 * DAY) return date.toLocaleDateString(undefined, { weekday: "short" });
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export type DateGroup = "Today" | "This week" | "Earlier";

/** Today = since local midnight; this week = the 7 days before that. */
export function dateGroup(value: string, now = new Date()): DateGroup {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ms = new Date(value).getTime();
  if (ms >= midnight) return "Today";
  if (ms >= midnight - 7 * DAY) return "This week";
  return "Earlier";
}
