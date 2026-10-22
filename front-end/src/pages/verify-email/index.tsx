import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/Auth.context";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import Header from "@/navbar/header";
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
    return attemptsLeft
      ? `That code is wrong. ${attemptsLeft} ${attemptsLeft === 1 ? "try" : "tries"} left.`
      : "That code is wrong.";
  }
  if (error === "code_expired") return "This code has expired. Request a new one.";
  return "Something went wrong. Please try again.";
}

function resendErrorText(error: string) {
  if (error === "email_failed") return "We couldn't send the email. Try again shortly.";
  if (error === "resend_cooldown") return null;
  return "Something went wrong. Please try again.";
}

export default function VerifyEmailPage() {
  const { revalidateUser, handleLogOut } = useAuth();
  const { user } = useUserProfileStore();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    takeEmailFailedFlag() ? "We couldn't send your code. Press Resend to get one." : null,
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
        setNotice("We sent you a new code.");
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
    <div className="min-h-screen flex justify-center px-4 pt-28 pb-16 welcome-bg-bottom bg-no-repeat bg-bottom bg-cover">
      <Header onlyLogo={true} />
      <div className="w-full max-w-sm">
        <div className="rounded-xl border bg-background/80 backdrop-blur-md shadow-sm p-6 flex flex-col items-center gap-5 text-center">
          <div className="bg-primary w-20 h-20 rounded-full flex items-center justify-center">
            <Mail className="text-primary-foreground w-10 h-10" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-extrabold text-2xl tracking-tight text-foreground">
              Verify Your Email
            </h1>
            <p className="text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground break-all">{user?.email}</span>
            </p>
          </div>

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
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {!error && notice && <p className="text-sm text-muted-foreground">{notice}</p>}

          <Button
            className="w-full"
            disabled={code.length !== 6 || isVerifying}
            onClick={() => submit(code)}
          >
            {isVerifying ? "Verifying…" : "Verify"}
          </Button>

          <p className="text-sm text-muted-foreground">
            Didn't receive an email?{" "}
            <Button
              variant="link"
              className="h-auto p-0"
              disabled={isResending || cooldown > 0}
              onClick={resend}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
            </Button>
          </p>

          <Button variant="ghost" size="sm" onClick={handleLogOut}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
