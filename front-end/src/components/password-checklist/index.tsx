import { Check, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES, passwordRuleLabel } from "@/lib/password";
import { t } from "@/i18n";

export function PasswordChecklist({ value, id, showFailures }: { value: string; id?: string; showFailures?: boolean }) {
  const typed = value.length > 0 || !!showFailures;
  return (
    <ul id={id} className="mt-2 grid gap-1 text-xs sm:grid-cols-2" aria-label={t("auth:passwordRules.label")}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.met(value);
        if (rule.onlyWhenBroken && met) return null;
        const Icon = !typed ? Circle : met ? Check : X;
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-1.5",
              !typed ? "text-muted-foreground" : met ? "text-success" : "text-destructive",
            )}
          >
            <Icon aria-hidden className="size-3.5 shrink-0" />
            {passwordRuleLabel(rule)}
            {typed && <span className="sr-only">{met ? t("auth:passwordRules.met") : t("auth:passwordRules.notMet")}</span>}
          </li>
        );
      })}
    </ul>
  );
}
