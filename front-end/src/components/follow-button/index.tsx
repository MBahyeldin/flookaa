import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPersonaFollowing } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { FollowStatus } from "@/types/persona";

const LABELS = { active: "Following", pending: "Requested" } as const;

export function FollowButton({
  personaId,
  name,
  status,
  requiresApproval = false,
  followLabel = "Follow",
  onChange,
}: {
  personaId: number;
  name?: string;
  status: FollowStatus;
  requiresApproval?: boolean;
  followLabel?: string;
  onChange: (status: FollowStatus) => void;
}) {
  const [busy, setBusy] = useState(false);
  const viewerPrivacy = useUserProfileStore((s) => s.persona?.privacy);

  const handleClick = async () => {
    if (busy) return;
    const follow = !status;
    if (
      status === "active" &&
      requiresApproval &&
      !confirm(`Unfollow ${name}? ${name} is private, so you'll lose access and have to request again.`)
    ) {
      return;
    }
    // Following shows a private persona to the one it follows.
    if (
      follow &&
      viewerPrivacy &&
      viewerPrivacy !== "public" &&
      !confirm(name ? `Follow ${name}? ${name} will see who you are.` : "Follow this persona? It will see who you are.")
    ) {
      return;
    }
    setBusy(true);
    const result = await setPersonaFollowing(personaId, follow);
    setBusy(false);
    if (result instanceof Error) {
      toast.error(result.message);
      return;
    }
    onChange(result);
  };

  return (
    <Button
      size="sm"
      variant={status ? "secondary" : "default"}
      disabled={busy}
      onClick={handleClick}
    >
      {status ? LABELS[status] : followLabel}
    </Button>
  );
}
