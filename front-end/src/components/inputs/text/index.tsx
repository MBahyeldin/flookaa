import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordChecklist } from "@/components/password-checklist";
import { MARK_ONLY } from "@/models/Forms/Form";
import { PASSWORD_RULES_ERROR } from "@/lib/password";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "@/types/FormFields";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function TextInput({
  setFieldValue,
  handleBlur,
  error,
  touched,
  className,
  initValue,
  field,
}: FormFieldProps) {
  const [value, setValue] = useState(initValue || "");
  const [revealed, setRevealed] = useState(false);
  const hint = field.hint?.(value);
  const isPassword = field.type === "password";
  const invalid = !!error && !!touched;
  // The checklist already says which rules fail.
  const shownByChecklist = field.passwordRules && error === PASSWORD_RULES_ERROR;
  const message = invalid && error !== MARK_ONLY && !shownByChecklist ? error : null;
  const noteId = `${field.id}-note`;
  const rulesId = `${field.id}-rules`;
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setFieldValue(
      field.id,
      e.target.value,
      field.isRequired || field.validate !== undefined
    );
  };
  return (
    <div className={cn(className, field.width)}>
      <div className="flex items-center gap-2">
        {field.icon}
        <Label htmlFor={field.id}>
          {" "}
          {field.label}{" "}
          {field.isRequired && <span className="text-destructive">*</span>}
        </Label>
      </div>
      <div className="relative mt-2">
        <Input
          id={field.id}
          type={field.interfaceType === "datetime" ? "datetime-local" : isPassword && revealed ? "text" : field.type}
          value={value}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          onChange={onChange}
          onBlur={handleBlur}
          aria-invalid={invalid || undefined}
          aria-describedby={cn(message || hint ? noteId : "", field.passwordRules ? rulesId : "") || undefined}
          className={cn(isPassword && "pe-11")}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {message ? (
        <p id={noteId} role="alert" className="text-sm text-destructive mt-1">{message}</p>
      ) : (
        hint && <p id={noteId} className="text-sm text-muted-foreground mt-1">{hint}</p>
      )}
      {field.passwordRules && <PasswordChecklist id={rulesId} value={value} showFailures={invalid} />}
    </div>
  );
}
