import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Boxes, Check, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SkeletonList } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import { listMyCommunities } from "@/services/communities";
import type { MyCommunity } from "@/types/community";

const TITLE = "Choose a community";
const LEAD = "It goes straight into one you manage. Any other one gets a request its managers review.";
const REQUEST_LEAD = "Its managers review the request before the channel shows in the community.";

function Row({
  community,
  selected,
  onSelect,
  request,
}: {
  community: MyCommunity;
  selected: boolean;
  onSelect: () => void;
  request: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary bg-accent" : "border-transparent hover:bg-muted",
      )}
    >
      <span data-theme={community.theme}>
        <Logo name={community.name} src={community.thumbnail || null} size="sm" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{community.name}</span>
        <span className="text-xs text-muted-foreground">
          {community.members_count.toLocaleString()} {community.members_count === 1 ? "member" : "members"} ·{" "}
          {community.can_manage && !request ? "goes straight in" : "request"}
        </span>
      </span>
      {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
      <p className="px-2 pt-2 text-overline font-semibold uppercase text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Body({
  value,
  onPick,
  onCancel,
  request,
}: {
  value: number | null;
  onPick: (community: MyCommunity) => void;
  onCancel: () => void;
  request: boolean;
}) {
  const [state, setState] = useState<"loading" | "error" | MyCommunity[]>("loading");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    let alive = true;
    listMyCommunities().then((r) => {
      if (alive) setState(r.ok ? r.data.communities : "error");
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setState("loading");
    setAttempt((a) => a + 1);
  };

  const all = Array.isArray(state) ? state : [];
  const q = query.trim().toLowerCase();
  const shown = q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
  const managed = shown.filter((c) => c.can_manage);
  const others = shown.filter((c) => !c.can_manage);
  const picked = all.find((c) => c.id === selected);

  let list: ReactNode;
  if (state === "loading") list = <SkeletonList count={4} />;
  else if (state === "error") list = <ErrorState compact title="Couldn't load your communities" onRetry={retry} />;
  else if (all.length === 0)
    list = (
      <EmptyState
        compact
        icon={Boxes}
        title="You're not in any community yet"
        body="Join or follow one to add channels to it."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/communities">Browse communities</Link>
          </Button>
        }
      />
    );
  else if (shown.length === 0) list = <EmptyState compact icon={SearchX} title={`No community matches “${query.trim()}”`} />;
  else
    list = (
      <>
        {managed.length > 0 && (
          <Group label="You manage">
            {managed.map((c) => (
              <Row key={c.id} community={c} selected={c.id === selected} onSelect={() => setSelected(c.id)} request={request} />
            ))}
          </Group>
        )}
        {others.length > 0 && (
          <Group label="Your communities">
            {others.map((c) => (
              <Row key={c.id} community={c} selected={c.id === selected} onSelect={() => setSelected(c.id)} request={request} />
            ))}
          </Group>
        )}
      </>
    );

  return (
    <>
      {all.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="community-picker-search">Search</Label>
          <Input
            id="community-picker-search"
            type="search"
            placeholder="Search your communities"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">{list}</div>
      <div className="flex gap-2 sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none">
          Cancel
        </Button>
        <Button type="button" disabled={!picked} onClick={() => picked && onPick(picked)} className="flex-1 sm:flex-none">
          Use this community
        </Button>
      </div>
    </>
  );
}

export function CommunityPicker({
  open,
  onOpenChange,
  value,
  onPick,
  request = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number | null;
  onPick: (community: MyCommunity) => void;
  /** Picking files a request even in a community you manage (an existing channel). */
  request?: boolean;
}) {
  const mobile = useIsMobile();
  const pick = (community: MyCommunity) => {
    onPick(community);
    onOpenChange(false);
  };
  const body = open && <Body value={value} onPick={pick} onCancel={() => onOpenChange(false)} request={request} />;

  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex max-h-[90dvh] flex-col gap-4 rounded-t-xl px-4 pb-4">
          <SheetHeader className="px-0">
            <SheetTitle>{TITLE}</SheetTitle>
            <SheetDescription>{request ? REQUEST_LEAD : LEAD}</SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>{request ? REQUEST_LEAD : LEAD}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
