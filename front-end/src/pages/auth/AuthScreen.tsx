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
import { useTranslation } from "react-i18next";
import { currentLanguage } from "@/i18n";
import AuthSplit from "./AuthSplit";

const SWITCH_TO = { login: "/sign-up", signup: "/login" };

export default function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const next = safeNext(rawNext);
  const { isAuthenticated, revalidateUser } = useAuth();
  const form = mode === "login" ? Form.login : Form.signup;
  const switchTo = SWITCH_TO[mode];
  const fromFollowLink = mode === "login" && next.startsWith("/follow/");
  const title = fromFollowLink ? t("login.followTitle") : t(`${mode}.title`);
  const lead = fromFollowLink ? t("login.followLead") : t(`${mode}.lead`);
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
          {t("login.passwordChanged")}
        </p>
      )}

      <FormComponent
        form={form}
        initialValues={mode === "signup" ? { language: currentLanguage() } : undefined}
        onStatusChange={onStatusChange}
        className="grid grid-cols-12 gap-4"
      >
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
            {t("login.forgot")}
          </Link>
        )}
        <p className="text-muted-foreground">
          {t(`${mode}.switchText`)}{" "}
          <Link to={switchHref} className="font-medium text-primary underline-offset-4 hover:underline">
            {t(`${mode}.switchLabel`)}
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
