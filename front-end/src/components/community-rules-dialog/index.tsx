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
  const isPrivate = community.visibility === "private";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{community.name} rules</DialogTitle>
          <DialogDescription>Please read them before you {isPrivate ? "ask to join" : "join"}.</DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-line text-sm">{community.rules}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              onOpenChange(false);
              onAgree();
            }}
          >
            {isPrivate ? "Agree and request" : "Agree and join"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
