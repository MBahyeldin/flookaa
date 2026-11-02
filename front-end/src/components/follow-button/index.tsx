import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPersonaFollowing } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { FollowStatus } from "@/types/persona";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/lib/errors";

export function FollowButton({
  personaId,
  name,
  status,
  requiresApproval = false,
  followLabel,
  size = "sm",
  onChange,
}: {
  personaId: number;
  name?: string;
  status: FollowStatus;
  requiresApproval?: boolean;
  followLabel?: string;
  size?: "sm" | "default";
  onChange: (status: FollowStatus) => void;
}) {
  const { t } = useTranslation(["personas", "common"]);
  const [busy, setBusy] = useState(false);
  const viewerPrivacy = useUserProfileStore((s) => s.persona?.privacy);

  const handleClick = async () => {
    if (busy) return;
    const follow = !status;
    if (
      status === "active" &&
      requiresApproval &&
      !confirm(t("follow.unfollowPrivateConfirm", { name }))
    ) {
      return;
    }
    // Following shows a private persona to the one it follows.
    if (
      follow &&
      viewerPrivacy &&
      viewerPrivacy !== "public" &&
      !confirm(name ? t("follow.revealConfirmNamed", { name }) : t("follow.revealConfirm"))
    ) {
      return;
    }
    setBusy(true);
    const result = await setPersonaFollowing(personaId, follow);
    setBusy(false);
    if (result instanceof Error) {
      toast.error(errorMessage(result.message));
      return;
    }
    onChange(result);
  };

  return (
    <Button
      size={size}
      variant={status ? "secondary" : "default"}
      loading={busy}
      onClick={handleClick}
    >
      {status === "active" ? t("common:actions.following") : status === "pending" ? t("common:actions.requested") : (followLabel ?? t("common:actions.follow"))}
    </Button>
  );
}
