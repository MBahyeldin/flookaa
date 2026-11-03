import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Community } from "@/types/community";
import { useTranslation } from "react-i18next";
import { isolate } from "@/i18n";

/** "Agree and join": shown before joining a community that has rules. Nothing is stored. */
export function CommunityRulesDialog({
  community,
  open,
  onOpenChange,
  onAgree,
  busy = false,
}: {
  community: Pick<Community, "name" | "rules" | "visibility">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgree: () => void;
  busy?: boolean;
}) {
  const { t } = useTranslation(["communities", "common"]);
  const isPrivate = community.visibility === "private";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("rules.dialogTitle", { name: isolate(community.name) })}</DialogTitle>
          <DialogDescription>{isPrivate ? t("rules.readBeforeRequest") : t("rules.readBeforeJoin")}</DialogDescription>
        </DialogHeader>
        <p dir="auto" className="whitespace-pre-line text-sm">{community.rules}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common:actions.cancel")}
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              onOpenChange(false);
              onAgree();
            }}
          >
            {isPrivate ? t("rules.agreeAndRequest") : t("rules.agreeAndJoin")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
