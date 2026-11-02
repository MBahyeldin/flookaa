import i18n, { t } from "@/i18n";

/** The editor schema's English title, translated by the type's name when there's a key for it. */
export function schemaTitle(name: string, fallback?: string): string {
  const key = `editor:schema.${name}`;
  return i18n.exists(key) ? (t as (k: string) => string)(key) : (fallback ?? name);
}
