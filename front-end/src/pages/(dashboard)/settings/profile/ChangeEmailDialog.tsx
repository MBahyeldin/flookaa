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

function requestErrorText(error: string, retryAfter?: number) {
  switch (error) {
    case "invalid_email":
      return "Enter a valid email address.";
    case "same_email":
      return "That's already your email.";
    case "email_taken":
      return "Another account uses this email.";
    case "email_managed_by_google":
      return "Your email comes from your Google account.";
    case "email_failed":
      return "We couldn't send the email. Try again shortly.";
    case "resend_cooldown":
      return `Wait ${retryAfter ?? 60}s before asking for another code.`;
    default:
      return "Something went wrong. Please try again.";
  }
}

function confirmErrorText(error: string, attemptsLeft?: number) {
  if (error === "invalid_code") {
    return attemptsLeft
      ? `That code is wrong. ${attemptsLeft} ${attemptsLeft === 1 ? "try" : "tries"} left.`
      : "That code is wrong.";
  }
  if (error === "code_expired") return "This code has expired. Send a new one.";
  if (error === "email_taken") return "Another account took this email meanwhile.";
  return "Something went wrong. Please try again.";
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
      toast.success("Your email was changed.");
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
          <DialogTitle>{step === "email" ? "Change email" : "Check your new email"}</DialogTitle>
          <DialogDescription>
            {step === "email" ? (
              "We'll send a code to the new address. Your email changes once you enter it."
            ) : (
              <>
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground break-all">{email.trim()}</span>. It works for 1 hour.
              </>
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
            <FormField label="New email" error={error}>
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
              Didn't get it?{" "}
              <Button variant="link" className="h-auto p-0" disabled={busy || cooldown > 0} onClick={send}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
              </Button>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          {step === "email" ? (
            <Button type="submit" form="change-email" loading={busy} disabled={!email.trim()}>
              Send code
            </Button>
          ) : (
            <Button loading={busy} disabled={code.length !== 6} onClick={() => confirm(code)}>
              Confirm
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
