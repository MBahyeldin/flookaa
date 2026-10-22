const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

export function formatCount(n: number, one: string, many: string): string {
  return `${compact.format(n)} ${n === 1 ? one : many}`;
}
