import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getInviteLink } from "@/services/persona";

const inviteUrl = (token: string) => `${window.location.origin}/follow/${token}`;

export default function ShareInviteLink({
  personaId,
  open,
  onOpenChange,
}: {
  personaId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getInviteLink(personaId)
      .then((t) => !cancelled && setToken(t))
      .catch((err: Error) => toast.error(err.message));
    return () => {
      cancelled = true;
    };
  }, [open, personaId]);

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const reset = async () => {
    if (!confirm("Reset the link? The old link will stop working.")) return;
    setBusy(true);
    try {
      setToken(await getInviteLink(personaId, true));
      toast.success("New link created");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Follow-request link</DialogTitle>
          <DialogDescription>
            Anyone with this link can ask to follow you. You approve each request.
          </DialogDescription>
        </DialogHeader>
        <Input readOnly value={token ? inviteUrl(token) : "Loading…"} onFocus={(e) => e.target.select()} />
        <DialogFooter>
          <Button variant="outline" disabled={!token || busy} onClick={reset}>
            Reset link
          </Button>
          <Button disabled={!token} onClick={copy}>
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
