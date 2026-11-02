import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/Auth.context";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import { Form } from "@/models/Forms/Form";
import AuthSplit from "@/pages/auth/AuthSplit";
import { Trans, useTranslation } from "react-i18next";

const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const [email, setEmail] = useState("");
  const onValuesChange = useCallback((values: Record<string, unknown>) => {
    setEmail(typeof values.email_address === "string" ? values.email_address : "");
  }, []);
  const onStatusChange = useCallback(
    (status: { success: boolean }) => {
      if (status.success) {
        setSentTo(email.trim());
        setCooldown(RESEND_SECONDS);
      }
    },
    [email],
  );

  if (sentTo !== null) {
    return (
      <AuthSplit
        title={t("checkEmail")}
        lead={
          <Trans
            t={t}
            i18nKey="forgot.sentLead"
            values={{ email: sentTo }}
            components={{ email: <span className="font-medium text-foreground break-all" /> }}
          />
        }
      >
        <p className="text-sm text-muted-foreground">{t("forgot.googleNote")}</p>
        <div className="flex flex-col items-start gap-2 text-sm">
          <Button
            variant="link"
            className="h-auto p-0 font-medium"
            disabled={cooldown > 0}
            onClick={() => {
              setSentTo(null);
              setFormKey((k) => k + 1);
            }}
          >
            {cooldown > 0 ? t("forgot.sendAgainIn", { seconds: cooldown }) : t("forgot.sendAgain")}
          </Button>
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit title={t("forgot.title")} lead={t("forgot.lead")}>
      <FormComponent
        key={formKey}
        form={Form.forgotPassword}
        initialValues={{ email_address: email }}
        onStatusChange={onStatusChange}
        onValuesChange={onValuesChange}
        className="grid grid-cols-12 gap-4"
      >
        {({ isSubmitting }) => (
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            {Form.forgotPassword.submitText}
          </Button>
        )}
      </FormComponent>
      <Link to="/login" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        {t("backToLogin")}
      </Link>
    </AuthSplit>
  );
}
