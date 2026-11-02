import { t } from "@/i18n";

// Zod messages built when shown, so they follow the language.
export const oneLine = { error: () => t("blocks:validation.oneLine") };
export const required = { error: () => t("blocks:validation.required") };
export const maxChars = (max: number) => ({ error: () => t("blocks:validation.maxChars", { max }) });
export const minItems = (count: number) => ({ error: () => t("blocks:validation.minItems", { count }) });
export const httpLink = { error: () => t("blocks:validation.httpLink") };
export const plainText = { error: () => t("blocks:validation.plainText") };
export const dateRange = (years: number) => ({ error: () => t("blocks:validation.dateRange", { years }) });
