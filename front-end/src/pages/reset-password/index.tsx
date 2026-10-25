import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Form } from "@/models/Forms/Form";
import AuthSplit from "@/pages/auth/AuthSplit";
import { checkResetToken } from "@/services/passwordReset";

// Read once, then dropped from the address bar so it doesn't stay in history.
function takeToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  if (token) {
    params.delete("token");
    const query = params.toString();
    window.history.replaceState(window.history.state, "", window.location.pathname + (query ? `?${query}` : ""));
  }
  return token;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token] = useState(takeToken);
  const [state, setState] = useState<"checking" | "valid" | "invalid" | "error">(token ? "checking" : "invalid");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    checkResetToken(token).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const onStatusChange = useCallback(
    (status: { success: boolean; error: string | null }) => {
      if (status.success) navigate("/login?reset=1", { replace: true });
      else if (status.error === "invalid_token") setState("invalid");
    },
    [navigate],
  );

  if (state === "invalid") {
    return (
      <AuthSplit title="This link has expired" lead="Reset links work once, for 1 hour. Ask for a new one.">
        <Button asChild size="lg" className="w-full">
          <Link to="/forgot-password">Send a new link</Link>
        </Button>
        <Link to="/login" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit title="Choose a new password" lead="Pick a password you don't use anywhere else.">
      {state === "error" ? (
        <ErrorState
          compact
          title="We couldn't check this link."
          onRetry={() => {
            setState("checking");
            setAttempt((a) => a + 1);
          }}
        />
      ) : (
        <FormComponent
          form={Form.resetPassword}
          initialValues={{ token }}
          onStatusChange={onStatusChange}
          className="grid grid-cols-12 gap-4"
        >
          {({ isSubmitting }) => (
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={isSubmitting}
              disabled={state === "checking"}
            >
              {Form.resetPassword.submitText}
            </Button>
          )}
        </FormComponent>
      )}
    </AuthSplit>
  );
}
