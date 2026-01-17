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
import OAuthProviders from "@/components/oauth-providers";

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
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 welcome-bg-bottom bg-no-repeat bg-bottom bg-cover" >
      <Card className={"w-full max-w-md shadow-xl"}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
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
        <OAuthProviders state="login" />
        </CardContent>
      </Card>

    </div>
  );
}

