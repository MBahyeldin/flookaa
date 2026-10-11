import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPersonaFollowing } from "@/services/persona";
import type { FollowStatus } from "@/types/persona";

const LABELS = { active: "Following", pending: "Requested" } as const;

export function FollowButton({
  personaId,
  name,
  status,
  requiresApproval = false,
  onChange,
}: {
  personaId: number;
  name: string;
  status: FollowStatus;
  requiresApproval?: boolean;
  onChange: (status: FollowStatus) => void;
}) {
  const [busy, setBusy] = useState(false);

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
      {status ? LABELS[status] : "Follow"}
    </Button>
  );
}
