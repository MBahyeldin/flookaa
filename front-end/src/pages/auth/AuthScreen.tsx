import { useCallback, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/Auth.context";
import { Form } from "@/models/Forms/Form";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import OAuthProviders from "@/components/oauth-providers";
import safeNext from "@/lib/safeNext";
import { AUTH_NEXT_KEY } from "@/hooks/useResumeAuthNext";
import { VERIFY_EMAIL_FAILED_KEY } from "@/services/verifyEmail";
import AuthSplit from "./AuthSplit";

const copy = {
  login: {
    form: Form.login,
    title: "Welcome back",
    lead: "Log in to pick up where your personas left off.",
    switchText: "New here?",
    switchLabel: "Create an account",
    switchTo: "/sign-up",
  },
  signup: {
    form: Form.signup,
    title: "Create your account",
    lead: "One account, as many personas as you like.",
    switchText: "Already have an account?",
    switchLabel: "Log in",
    switchTo: "/login",
  },
};

export default function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const next = safeNext(rawNext);
  const { isAuthenticated, revalidateUser } = useAuth();
  const { form, switchText, switchLabel, switchTo } = copy[mode];
  const fromFollowLink = mode === "login" && next.startsWith("/follow/");
  const title = fromFollowLink ? "Log in to continue" : copy[mode].title;
  const lead = fromFollowLink
    ? "You opened a follow link. Log in and we'll bring you back to it."
    : copy[mode].lead;
  const passwordChanged = mode === "login" && searchParams.get("reset") === "1";
  // After sign-up DashboardLayout shows the verify step on any route, so next survives it.
  const destination = next;

  // A Google attempt that never came back must not redirect a later login.
  useEffect(() => {
    try {
      sessionStorage.removeItem(AUTH_NEXT_KEY);
    } catch {
      // No storage, nothing to clear.
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination);
    }
  }, [isAuthenticated, navigate, destination]);

  const onStatusChange = useCallback(
    (status: { success: boolean; error: string | null; result?: unknown }) => {
      if (status && status.success) {
        if ((status.result as { email_sent?: boolean } | null)?.email_sent === false) {
          try {
            sessionStorage.setItem(VERIFY_EMAIL_FAILED_KEY, "1");
          } catch {
            // The verify step still offers Resend.
          }
        }
        localStorage.setItem("loginSuccess", "true");
        revalidateUser();
        navigate(destination);
      }
    },
    [revalidateUser, navigate, destination],
  );

  const switchHref = rawNext ? `${switchTo}?next=${encodeURIComponent(next)}` : switchTo;

  return (
    <AuthSplit title={title} lead={lead}>
      {passwordChanged && (
        <p role="status" className="rounded-md border border-success bg-card px-3 py-2 text-sm text-foreground">
          Password changed. Log in with your new password.
        </p>
      )}

      <FormComponent form={form} onStatusChange={onStatusChange} className="grid grid-cols-12 gap-4">
        {({ isSubmitting }) => (
          <div className="flex flex-col gap-3">
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              {form.submitText}
            </Button>
            <OAuthProviders state={mode} next={next} />
          </div>
        )}
      </FormComponent>

      <div className="flex flex-col gap-2 text-sm">
        {mode === "login" && (
          <Link to="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        )}
        <p className="text-muted-foreground">
          {switchText}{" "}
          <Link to={switchHref} className="font-medium text-primary underline-offset-4 hover:underline">
            {switchLabel}
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
