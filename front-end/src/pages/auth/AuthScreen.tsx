import { useCallback, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/Auth.context";
import { Form } from "@/models/Forms/Form";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import OAuthProviders from "@/components/oauth-providers";
import safeNext from "@/lib/safeNext";
import { AUTH_NEXT_KEY } from "@/hooks/useResumeAuthNext";

const copy = {
  login: {
    form: Form.login,
    subtitle: "Log in to continue",
    switchText: "New to Flookaa?",
    switchLabel: "Create an account",
    switchTo: "/sign-up",
  },
  signup: {
    form: Form.signup,
    subtitle: "Create your account",
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
  const { form, subtitle, switchText, switchLabel, switchTo } = copy[mode];
  // Sign-up lands on "/", where the unverified page takes over.
  const destination = mode === "login" ? next : "/";

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
    (status: { success: boolean; error: string | null }) => {
      if (status && status.success) {
        localStorage.setItem("loginSuccess", "true");
        revalidateUser();
        navigate(destination);
      }
    },
    [revalidateUser, navigate, destination],
  );

  const switchHref = rawNext ? `${switchTo}?next=${encodeURIComponent(next)}` : switchTo;

  return (
    <div className="min-h-screen flex justify-center px-4 pt-28 pb-16 welcome-bg-bottom bg-no-repeat bg-bottom bg-cover">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-background/80 backdrop-blur-md shadow-xl p-6 flex flex-col gap-5">
          <div className="text-center flex flex-col gap-1">
            <h1 className="font-extrabold text-3xl tracking-tight text-foreground">
              Welcome To Flookaa
            </h1>
            <p className="text-muted-foreground font-medium">{subtitle}</p>
          </div>

          <OAuthProviders state={mode} next={next} />

          <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="flex-1 border-t" />
            or
            <span className="flex-1 border-t" />
          </div>

          <FormComponent
            form={form}
            onStatusChange={onStatusChange}
            changeOpacityWhenSubmitting={true}
            className="grid grid-cols-12 gap-4"
          >
            <Button type="submit" size="lg" borderRadius="full" className="w-full">
              {form.submitText}
            </Button>
          </FormComponent>

          <p className="text-center text-sm text-muted-foreground">
            {switchText}{" "}
            <Link to={switchHref} className="font-medium text-primary underline-offset-4 hover:underline">
              {switchLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
