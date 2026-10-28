import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/Auth.context";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/user";
import { ChangeEmailDialog } from "./ChangeEmailDialog";

export function EmailSection({ profile }: { profile: Profile }) {
  const { revalidateUser } = useAuth();
  const [email, setEmail] = useState(profile.email_address);
  const [open, setOpen] = useState(false);

  return (
    <SettingsSection id="email" title="Email">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium break-all">{email}</span>
            {profile.is_verified && (
              <Badge variant="secondary">
                <ShieldCheck />
                Verified
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {profile.has_password
              ? "To change it, we send a code to the new address first."
              : "Managed by Google. It changes with your Google account."}
          </p>
        </div>
        {profile.has_password && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            Change email
          </Button>
        )}
      </div>
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
    </SettingsSection>
  );
}
