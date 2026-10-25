import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/Auth.context";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import { Form } from "@/models/Forms/Form";
import AuthSplit from "@/pages/auth/AuthSplit";

const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
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
        title="Check your email"
        lead={
          <>
            If an account with a password uses{" "}
            <span className="font-medium text-foreground break-all">{sentTo}</span>, a link to reset it is on its way.
            It works for 1 hour.
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Accounts made with Google log in with Google instead.</p>
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
            {cooldown > 0 ? `Didn't get it? Send again in ${cooldown}s` : "Didn't get it? Send again"}
          </Button>
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to log in
          </Link>
        </div>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit title="Reset your password" lead="Enter your account's email and we'll send you a link.">
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
        Back to log in
      </Link>
    </AuthSplit>
  );
}
