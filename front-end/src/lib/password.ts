// Mirrors backend/internal/password.Check.
export type PasswordRule = { id: string; label: string; met: (pw: string) => boolean; onlyWhenBroken?: boolean };

const isLetter = (c: string) => /\p{L}/u.test(c);
const isDigit = (c: string) => /\p{Nd}/u.test(c);
const isSpace = (c: string) => /\s/u.test(c);

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "8 or more characters", met: (pw) => [...pw].length >= 8 },
  { id: "max", label: "At most 72 bytes", met: (pw) => new TextEncoder().encode(pw).length <= 72, onlyWhenBroken: true },
  { id: "upper", label: "An uppercase letter", met: (pw) => /\p{Lu}/u.test(pw) },
  { id: "lower", label: "A lowercase letter", met: (pw) => /\p{Ll}/u.test(pw) },
  { id: "digit", label: "A number", met: (pw) => /\p{Nd}/u.test(pw) },
  {
    id: "special",
    label: "A special character",
    met: (pw) => [...pw].some((c) => !isLetter(c) && !isDigit(c) && !isSpace(c)),
  },
];

export const PASSWORD_RULES_ERROR = "Choose a password that meets every rule.";

export function passwordError(value: unknown) {
  const pw = typeof value === "string" ? value : "";
  return PASSWORD_RULES.every((r) => r.met(pw)) ? null : PASSWORD_RULES_ERROR;
}
