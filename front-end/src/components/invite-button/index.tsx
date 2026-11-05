import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { invitePersona, uninvitePersona } from "@/services/persona";
import type { InviteStatus } from "@/types/persona";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/lib/errors";

export function InviteButton({
  personaId,
  name,
  status,
  size = "sm",
  onChange,
}: {
  personaId: number;
  name?: string;
  status: InviteStatus;
  size?: "sm" | "default";
  /** "following" when the persona already follows you, or its request was just approved. */
  onChange: (status: InviteStatus | "following") => void;
}) {
  const { t } = useTranslation("personas");
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    if (status === "pending" && !confirm(name ? t("invite.cancelConfirmNamed", { name }) : t("invite.cancelConfirm"))) return;
    setBusy(true);
    const result = status === "pending" ? await uninvitePersona(personaId) : await invitePersona(personaId);
    setBusy(false);
    if (result instanceof Error) {
      toast.error(errorMessage(result.message));
      return;
    }
    if (result === "following") {
      toast.success(name ? t("invite.nowFollowsNamed", { name }) : t("invite.nowFollows"));
      onChange("following");
      return;
    }
    onChange(result === "invited" ? "pending" : null);
  };

  return (
    <Button size={size} variant={status ? "secondary" : "outline"} loading={busy} onClick={handleClick}>
      {status ? t("invite.invited") : t("invite.invite")}
    </Button>
  );
}
