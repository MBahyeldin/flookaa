"use client";

import verifyEmail from "@/services/verifyEmail";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  MailCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function VerifyEmailPage() {
  const [verificationStatus, setVerificationStatus] = React.useState<
    "pending" | "success" | "error"
  >("pending");
  const navigate = useNavigate();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setVerificationStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyEmail(code);
        if (response?.error) throw new Error();
        setVerificationStatus("success");

        setTimeout(() => {
              navigate("/");
        }, 2000);
      } catch {
        setVerificationStatus("error");
      }
    };

    verify();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center from-foreground to-foreground/70 via-foreground px-4">
      <Card className="w-full max-w-md rounded-2xl shadow-2xl border border-muted backdrop-blur">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Email Verification
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {verificationStatus === "pending" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="">
                Verifying your email address…
              </p>
            </div>
          )}

          {verificationStatus === "success" && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-lg font-medium">
                Email verified successfully 🎉
              </p>
              <p className="text-sm text-foreground/70">
                Redirecting you to your dashboard…
              </p>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-lg font-medium text-destructive">
                Verification failed
              </p>
              <p className="text-sm text-foreground/70">
                This link is invalid or has expired.
              </p>
              <Button
                variant="default"
                onClick={() => (window.location.href = "/resend-verification")}
              >
                Request a new link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
