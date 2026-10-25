import { useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/Auth.context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/user";
import { ChangeEmailDialog } from "./ChangeEmailDialog";

export function EmailCard({ profile }: { profile: Profile }) {
  const { revalidateUser } = useAuth();
  const [email, setEmail] = useState(profile.email_address);
  const [open, setOpen] = useState(false);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email
        </CardTitle>
        <CardDescription>
          {profile.has_password
            ? "Changing it takes a code sent to the new address."
            : "Managed by your Google account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-medium text-foreground break-all">{email}</span>
        {profile.has_password && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            Change
          </Button>
        )}
      </CardContent>
      {profile.has_password && (
        <ChangeEmailDialog
          open={open}
          onOpenChange={setOpen}
          onChanged={(next) => {
            setEmail(next);
            revalidateUser();
          }}
        />
      )}
    </Card>
  );
}
