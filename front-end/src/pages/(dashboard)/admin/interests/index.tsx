import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotFound from "@/components/not-found";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/Auth.context";
import { cn } from "@/lib/utils";
import {
  adminListInterests,
  createInterest,
  createInterestGroup,
  moveInterest,
  moveInterestGroup,
  setInterestRetired,
  updateInterest,
  updateInterestGroup,
} from "@/services/interests";
import type { AdminCatalogue, AdminInterest, AdminInterestGroup } from "@/types/interest";
import CatalogueDialog from "./CatalogueDialog";

type Editing =
  | { kind: "interest"; interest: AdminInterest | null; groupId: number | null }
  | { kind: "group"; group: AdminInterestGroup | null }
  | null;

export default function AdminInterestsPage() {
  const { user } = useAuth();
  if (!user?.is_admin) return <NotFound />;
  return <InterestsAdmin />;
}

function MoveButtons({
  label,
  first,
  last,
  disabled,
  onMove,
}: {
  label: string;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <>
      {!first && (
        <Button variant="ghost" size="icon" aria-label={`Move ${label} up`} disabled={disabled} onClick={() => onMove("up")}>
          <ArrowUp />
        </Button>
      )}
      {!last && (
        <Button variant="ghost" size="icon" aria-label={`Move ${label} down`} disabled={disabled} onClick={() => onMove("down")}>
          <ArrowDown />
        </Button>
      )}
    </>
  );
}

function InterestsAdmin() {
  const [catalogue, setCatalogue] = useState<AdminCatalogue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);

  const load = useCallback(async () => {
    const result = await adminListInterests();
    if (result.ok) {
      setCatalogue(result.data);
      setError(null);
    } else {
      setError("Couldn't load interests.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<{ ok: boolean }>) => {
    setBusy(true);
    const result = await action();
    await load();
    if (!result.ok) setError("That didn't work. Please try again.");
    setBusy(false);
  };

  if (catalogue === null) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {error ? <ErrorState title="Couldn't load interests" onRetry={load} /> : <SkeletonList count={6} />}
      </div>
    );
  }

  const groups = catalogue?.groups ?? [];
  const interests = catalogue?.interests ?? [];
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const active = interests.filter((i) => !i.retired);
  const ungrouped = active.filter((i) => i.group_id === null || !groupName.has(i.group_id));
  const retired = interests.filter((i) => i.retired);

  const row = (item: AdminInterest, list: AdminInterest[], index: number, showGroup = false) => (
    <li key={item.id} className={cn("flex items-center gap-3 px-3 py-2", item.retired && "opacity-60")}>
      <span className="w-8 shrink-0 text-center text-xl" aria-hidden>
        {item.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{item.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {item.slug}
          {showGroup && item.group_id !== null && groupName.has(item.group_id) && ` · ${groupName.get(item.group_id)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <MoveButtons
          label={item.name}
          first={index === 0}
          last={index === list.length - 1}
          disabled={busy}
          onMove={(d) => run(() => moveInterest(item.id, d))}
        />
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${item.name}`} disabled={busy}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing({ kind: "interest", interest: item, groupId: item.group_id })}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(() => setInterestRetired(item.id, !item.retired))}>
              {item.retired ? "Restore" : "Retire"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );

  const list = (items: AdminInterest[], showGroup = false) =>
    items.length === 0 ? (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">No interests yet</p>
    ) : (
      <ul className="divide-y divide-border">{items.map((item, i) => row(item, items, i, showGroup))}</ul>
    );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Interests</h1>
          <p className="text-sm text-muted-foreground">
            What people pick in onboarding and tag personas and channels with.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing({ kind: "group", group: null })}>
            <Plus />
            Add group
          </Button>
          {groups.length > 0 && (
            <Button onClick={() => setEditing({ kind: "interest", interest: null, groupId: null })}>
              <Plus />
              Add interest
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {groups.length === 0 && (
        <EmptyState
          icon={Tags}
          title="No interests yet"
          body="Add a group first, then its interests."
          action={<Button onClick={() => setEditing({ kind: "group", group: null })}>Add group</Button>}
        />
      )}
      <div className="flex flex-col gap-6">
        {groups.map((group, gi) => (
          <Card key={group.id}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">{group.name}</CardTitle>
                <p className="truncate text-sm text-muted-foreground">{group.slug}</p>
              </div>
              <MoveButtons
                label={group.name}
                first={gi === 0}
                last={gi === groups.length - 1}
                disabled={busy}
                onMove={(d) => run(() => moveInterestGroup(group.id, d))}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${group.name}`}
                disabled={busy}
                onClick={() => setEditing({ kind: "group", group })}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Add interest to ${group.name}`}
                disabled={busy}
                onClick={() => setEditing({ kind: "interest", interest: null, groupId: group.id })}
              >
                <Plus />
              </Button>
            </CardHeader>
            <CardContent className="p-1">{list(active.filter((i) => i.group_id === group.id))}</CardContent>
          </Card>
        ))}
        {ungrouped.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-destructive">No group: assign one to show them</h2>
            <Card>
              <CardContent className="p-1">{list(ungrouped)}</CardContent>
            </Card>
          </section>
        )}
        {retired.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Retired</h2>
            <Card>
              <CardContent className="p-1">{list(retired, true)}</CardContent>
            </Card>
          </section>
        )}
      </div>
      {editing?.kind === "interest" && (
        <CatalogueDialog
          title={editing.interest ? "Edit interest" : "Add interest"}
          initial={{ ...editing.interest, group_id: editing.groupId }}
          groups={groups}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            const input = { name: v.name, slug: v.slug, emoji: v.emoji, group_id: v.group_id };
            const result = editing.interest ? await updateInterest(editing.interest.id, input) : await createInterest(input);
            if (result.ok) await load();
            return result;
          }}
        />
      )}
      {editing?.kind === "group" && (
        <CatalogueDialog
          title={editing.group ? "Edit group" : "Add group"}
          initial={editing.group ?? undefined}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            const input = { name: v.name, slug: v.slug };
            const result = editing.group ? await updateInterestGroup(editing.group.id, input) : await createInterestGroup(input);
            if (result.ok) await load();
            return result;
          }}
        />
      )}
    </div>
  );
}
