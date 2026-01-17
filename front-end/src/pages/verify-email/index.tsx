"use client";

import verifyEmail from "@/services/verifyEmail";
import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Mail,
  XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/Auth.context";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button";
import Header from "@/navbar/header";
import { useUserProfileStore } from "@/stores/UserProfileStore";

export default function VerifyEmailPage() {
  const { revalidateUser } = useAuth();
  const { user } = useUserProfileStore();
  const [code, setCode] = useState("")
  const [isVerifyBtnDisabled, setIsVerifyBtnDisabled] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const navigate = useNavigate();

  useEffect(() => {
    if(code && code.length == 6) {
      return setIsVerifyBtnDisabled(false)
    }
    setIsVerifyBtnDisabled(true)
  }, [code]);

  const handleVerifyClick = async () => {
    console.log("Verifying code:", code);
    try {
      const response = await verifyEmail(code);
      if (response?.error) throw new Error();
      setVerificationStatus("success");

      setTimeout(() => {
            revalidateUser();
            navigate("/");
      }, 2000);
    } catch {
      setVerificationStatus("error");
    }
  };
  

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Header onlyLogo={true} />
      <div className="flex flex-col items-center gap-6">
      {verificationStatus === "pending" && (
        <>
        <div className="bg-primary w-24 h-24 rounded-full flex items-center justify-center">
          <Mail className="text-primary-foreground w-14 h-14" />
        </div>
        <h1 className="text-foregrund">Verify Your Email</h1>
        <span className="text-muted-foreground text-center max-w-sm">
          We have sent a verification link to "{user?.email}"
        </span>
        <InputOTP maxLength={6} value={code} onChange={(val) => setCode(val)}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        <Button variant={"default"} disabled={isVerifyBtnDisabled} onClick={handleVerifyClick}>
          Verify
        </Button>
        </>
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
                This code is invalid or has expired.
              </p>
              <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setVerificationStatus("pending")}
              >
                Try Again
              </Button>
              <Button
                variant="default"
                onClick={() => setVerificationStatus("pending")}
              >
                Request a new code
              </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
