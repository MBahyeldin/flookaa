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
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/lib/errors";

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
  const { t } = useTranslation(["personas", "common"]);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getInviteLink(personaId)
      .then((next) => !cancelled && setToken(next))
      .catch((err: Error) => toast.error(errorMessage(err.message)));
    return () => {
      cancelled = true;
    };
  }, [open, personaId]);

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success(t("common:share.copied"));
    } catch {
      toast.error(t("common:share.copyFailed"));
    }
  };

  const reset = async () => {
    if (!confirm(t("followLink.resetConfirm"))) return;
    setBusy(true);
    try {
      setToken(await getInviteLink(personaId, true));
      toast.success(t("followLink.resetDone"));
    } catch (err) {
      toast.error(errorMessage((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("followLink.title")}</DialogTitle>
          <DialogDescription>{t("followLink.dialogLead")}</DialogDescription>
        </DialogHeader>
        <Input readOnly value={token ? inviteUrl(token) : t("common:states.loading")} onFocus={(e) => e.target.select()} />
        <DialogFooter>
          <Button variant="outline" disabled={!token || busy} onClick={reset}>
            {t("followLink.resetLink")}
          </Button>
          <Button disabled={!token} onClick={copy}>
            {t("common:actions.copy")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
