import { t } from "@/i18n";

// Mirrors backend/internal/password.Check.
export type PasswordRule = { id: "length" | "max" | "upper" | "lower" | "digit" | "special"; met: (pw: string) => boolean; onlyWhenBroken?: boolean };

const isLetter = (c: string) => /\p{L}/u.test(c);
const isDigit = (c: string) => /\p{Nd}/u.test(c);
const isSpace = (c: string) => /\s/u.test(c);

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", met: (pw) => [...pw].length >= 8 },
  { id: "max", met: (pw) => new TextEncoder().encode(pw).length <= 72, onlyWhenBroken: true },
  { id: "upper", met: (pw) => /\p{Lu}/u.test(pw) },
  { id: "lower", met: (pw) => /\p{Ll}/u.test(pw) },
  { id: "digit", met: (pw) => /\p{Nd}/u.test(pw) },
  { id: "special", met: (pw) => [...pw].some((c) => !isLetter(c) && !isDigit(c) && !isSpace(c)) },
];

export function passwordRuleLabel(rule: PasswordRule) {
  return t(`auth:passwordRules.${rule.id}`);
}

export function passwordRulesError() {
  return t("auth:passwordRules.error");
}

export function passwordError(value: unknown) {
  const pw = typeof value === "string" ? value : "";
  return PASSWORD_RULES.every((r) => r.met(pw)) ? null : passwordRulesError();
}
