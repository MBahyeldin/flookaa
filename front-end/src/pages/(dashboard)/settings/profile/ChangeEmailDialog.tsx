import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  cancelEmailChange,
  confirmEmailChange,
  requestEmailChange,
} from "@/services/emailChange";
import { Trans, useTranslation } from "react-i18next";
import { t } from "@/i18n";
import { errorMessage } from "@/lib/errors";

function requestErrorText(error: string, retryAfter?: number) {
  if (error === "resend_cooldown") return t("settings:email.cooldown", { seconds: retryAfter ?? 60 });
  return errorMessage(error);
}

function confirmErrorText(error: string, attemptsLeft?: number) {
  if (error === "invalid_code") {
    return attemptsLeft ? t("auth:verify.wrongCodeLeft", { count: attemptsLeft }) : t("auth:verify.wrongCode");
  }
  if (error === "code_expired") return t("settings:email.codeExpired");
  if (error === "email_taken") return t("settings:email.takenMeanwhile");
  return t("errors:generic");
}

export function ChangeEmailDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (email: string) => void;
}) {
  const { t } = useTranslation(["settings", "common"]);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const reset = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setError(null);
  };

  const close = (next: boolean) => {
    if (!next && step === "code") void cancelEmailChange();
    if (!next) reset();
    onOpenChange(next);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    const result = await requestEmailChange(email.trim());
    setBusy(false);
    if (result.retry_after) setCooldown(result.retry_after);
    if (result.ok) {
      setCode("");
      setStep("code");
      return;
    }
    setError(requestErrorText(result.error, result.retry_after));
  };

  const confirm = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    const result = await confirmEmailChange(value);
    setBusy(false);
    if (result.ok) {
      toast.success(t("email.changed"));
      onChanged(result.email_address ?? email.trim());
      reset();
      onOpenChange(false);
      return;
    }
    setCode("");
    setError(confirmErrorText(result.error, result.attempts_left));
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step === "email" ? t("email.change") : t("email.checkNew")}</DialogTitle>
          <DialogDescription>
            {step === "email" ? (
              t("email.dialogLead")
            ) : (
              <Trans
                t={t}
                i18nKey="email.codeSent"
                values={{ email: email.trim() }}
                components={{ email: <span className="font-medium text-foreground break-all" /> }}
              />
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <form
            id="change-email"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <FormField label={t("email.newEmail")} error={error}>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                required
              />
            </FormField>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(val) => {
                setCode(val);
                setError(null);
              }}
              onComplete={confirm}
              disabled={busy}
            >
              <InputOTPGroup aria-invalid={!!error || undefined}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t("email.didntGetIt")}{" "}
              <Button variant="link" className="h-auto p-0" disabled={busy || cooldown > 0} onClick={send}>
                {cooldown > 0 ? t("email.resendIn", { seconds: cooldown }) : t("email.resend")}
              </Button>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            {t("common:actions.cancel")}
          </Button>
          {step === "email" ? (
            <Button type="submit" form="change-email" loading={busy} disabled={!email.trim()}>
              {t("email.sendCode")}
            </Button>
          ) : (
            <Button loading={busy} disabled={code.length !== 6} onClick={() => confirm(code)}>
              {t("common:actions.confirm")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
