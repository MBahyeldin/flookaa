import { useEffect, useState } from "react";
import { useAuth } from "@/Auth.context";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import AuthSplit from "@/pages/auth/AuthSplit";
import { Trans, useTranslation } from "react-i18next";
import { t } from "@/i18n";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import verifyEmail, {
  resendVerification,
  VERIFY_EMAIL_FAILED_KEY,
} from "@/services/verifyEmail";

function takeEmailFailedFlag() {
  try {
    const failed = sessionStorage.getItem(VERIFY_EMAIL_FAILED_KEY) === "1";
    sessionStorage.removeItem(VERIFY_EMAIL_FAILED_KEY);
    return failed;
  } catch {
    return false;
  }
}

function verifyErrorText(error: string, attemptsLeft?: number) {
  if (error === "invalid_code") {
    return attemptsLeft ? t("auth:verify.wrongCodeLeft", { count: attemptsLeft }) : t("auth:verify.wrongCode");
  }
  if (error === "code_expired") return t("auth:verify.expired");
  return t("errors:generic");
}

function resendErrorText(error: string) {
  if (error === "email_failed") return t("errors:email_failed");
  if (error === "resend_cooldown") return null;
  return t("errors:generic");
}

export default function VerifyEmailPage() {
  const { t } = useTranslation(["auth", "common"]);
  const { revalidateUser, handleLogOut } = useAuth();
  const { user } = useUserProfileStore();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    takeEmailFailedFlag() ? t("verify.sendFailed") : null,
  );
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async (value: string) => {
    if (value.length !== 6 || isVerifying) return;
    setIsVerifying(true);
    setError(null);
    try {
      const result = await verifyEmail(value);
      if (result.ok) {
        // The layout leaves this step once the user reloads as verified.
        revalidateUser();
        return;
      }
      setError(verifyErrorText(result.error, result.attempts_left));
      setCode("");
    } catch {
      setError(verifyErrorText("verification_failed"));
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    setIsResending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resendVerification();
      if (result.ok) {
        setCode("");
        setNotice(t("verify.resent"));
      } else if (result.error === "already_verified") {
        revalidateUser();
      } else {
        setError(resendErrorText(result.error));
      }
      if (result.retry_after) setCooldown(result.retry_after);
    } catch {
      setError(resendErrorText("resend_failed"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthSplit
      title={t("checkEmail")}
      lead={
        <Trans
          t={t}
          i18nKey="verify.lead"
          values={{ email: user?.email }}
          components={{ email: <span className="font-medium text-foreground break-all" /> }}
        />
      }
    >
      <div className="flex flex-col gap-2">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(val) => {
            setCode(val);
            setError(null);
          }}
          onComplete={submit}
          disabled={isVerifying}
        >
          <InputOTPGroup aria-invalid={!!error || undefined}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {error ? (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {notice ?? t("verify.hint")}
          </p>
        )}
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={code.length !== 6}
        loading={isVerifying}
        onClick={() => submit(code)}
      >
        {t("verify.submit")}
      </Button>

      <div className="flex flex-col items-start gap-2 text-sm">
        <Button
          variant="link"
          className="h-auto p-0 font-medium"
          disabled={isResending || cooldown > 0}
          onClick={resend}
        >
          {cooldown > 0 ? t("verify.resendIn", { seconds: cooldown }) : t("verify.resend")}
        </Button>
        <p className="text-muted-foreground">
          {t("verify.wrongEmail")}{" "}
          <Button variant="link" className="h-auto p-0 text-muted-foreground underline" onClick={handleLogOut}>
            {t("common:shell.logOut")}
          </Button>
        </p>
      </div>
    </AuthSplit>
  );
}
