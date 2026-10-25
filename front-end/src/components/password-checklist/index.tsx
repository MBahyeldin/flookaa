import { Check, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES } from "@/lib/password";

export function PasswordChecklist({ value, id, showFailures }: { value: string; id?: string; showFailures?: boolean }) {
  const typed = value.length > 0 || !!showFailures;
  return (
    <ul id={id} className="mt-2 grid gap-1 text-xs sm:grid-cols-2" aria-label="Password rules">
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
            {rule.label}
            {typed && <span className="sr-only">{met ? " (met)" : " (not met)"}</span>}
          </li>
        );
      })}
    </ul>
  );
}
