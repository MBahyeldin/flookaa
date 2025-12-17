import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect } from "react";
import { useAuth } from "@/Auth.context";
import { useNavigate } from "react-router-dom";
import { Form } from "@/models/Forms/Form";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import { Github, Linkedin } from "lucide-react";
import loginWithGoogle from "@/services/loginWithGoogle";

export default function SignupPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, revalidateUser } = useAuth();

  // this should be handled by a route guard but just in case
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  const onStatusChange = (status: {
    success: boolean;
    error: string | null;
  }) => {
    if (status && status.success) {
      localStorage.setItem("loginSuccess", "true");
      revalidateUser();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className={"w-full max-w-md shadow-xl"}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {Form.login.title}
          </CardTitle>
          <CardDescription>{Form.login.description}</CardDescription>
          <CardAction>
            <Button variant="link" onClick={() => navigate("/sign-up")}>
              Sign Up
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <>
            <FormComponent
              form={Form.login}
              onStatusChange={onStatusChange}
              changeOpacityWhenSubmitting={true}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto"
            >
              <div className="md:col-span-12">
                <Button type="submit" className="w-full">
                  {Form.login.submitText}
                </Button>
              </div>
            </FormComponent>
          </>
          <div>
          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-1 gap-3">
            {/* Google */}
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              type="button"
              onClick={loginWithGoogle}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.7 1.22 9.19 3.61l6.85-6.85C35.82 2.52 30.28 0 24 0 14.64 0 6.68 5.38 2.73 13.22l7.98 6.19C12.61 13.36 17.9 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.1 24.55c0-1.63-.15-3.2-.43-4.73H24v9.05h12.4c-.54 2.9-2.18 5.36-4.65 7.02l7.17 5.58C43.11 37.09 46.1 31.41 46.1 24.55z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.71 28.41a14.5 14.5 0 0 1 0-8.82l-7.98-6.19A23.93 23.93 0 0 0 0 24c0 3.92.94 7.64 2.73 10.6l7.98-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.28 0 11.82-2.07 15.76-5.63l-7.17-5.58c-2 1.34-4.56 2.13-8.59 2.13-6.1 0-11.39-3.86-13.29-9.41l-7.98 6.19C6.68 42.62 14.64 48 24 48z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* GitHub */}
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              type="button"
              onClick={() => console.log("GitHub login")}
            >
              <Github className="h-4 w-4" />
              Continue with GitHub
            </Button>

            {/* LinkedIn */}
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              type="button"
              onClick={() => console.log("LinkedIn login")}
            >
              <Linkedin className="h-4 w-4" />
              Continue with LinkedIn
            </Button>
          </div>
        </div>

        </CardContent>
      </Card>
    </div>
  );
}
