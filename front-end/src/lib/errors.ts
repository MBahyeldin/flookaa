import i18n, { t } from "@/i18n";

/** A backend error code as a sentence; unknown codes get `fallback`, else the generic message. */
export function errorMessage(code: string | null | undefined, fallback?: string): string {
  const key = `errors:${code}`;
  if (code && i18n.exists(key)) return (t as (k: string) => string)(key);
  return fallback ?? t("errors:generic");
}

/** An Apollo error as a sentence: a known code from the server, else `fallback`. */
export function graphqlErrorMessage(err: unknown, fallback: string, offline: string): string {
  const errors = (err as { errors?: { message?: string }[] } | null)?.errors;
  return Array.isArray(errors) ? errorMessage(errors[0]?.message, fallback) : offline;
}
