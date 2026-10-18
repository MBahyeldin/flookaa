import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotFound from "@/components/not-found";
import SectionLoader from "@/components/section-loader";
import { useAuth } from "@/Auth.context";
import { cn } from "@/lib/utils";
import {
  adminListInterests,
  createInterest,
  moveInterest,
  setInterestRetired,
  updateInterest,
} from "@/services/interests";
import type { AdminInterest, InterestInput } from "@/types/interest";
import InterestDialog from "./InterestDialog";

type Editing = { interest: AdminInterest | null } | null;

export default function AdminInterestsPage() {
  const { user } = useAuth();
  if (!user?.is_admin) return <NotFound />;
  return <InterestsAdmin />;
}

function InterestsAdmin() {
  const [items, setItems] = useState<AdminInterest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing>(null);

  const load = useCallback(async () => {
    const result = await adminListInterests();
    if (result.ok) {
      setItems(result.data);
      setError(null);
    } else {
      setError("Couldn't load interests.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: number, action: () => Promise<{ ok: boolean }>) => {
    setBusy(id);
    const result = await action();
    if (!result.ok) setError("That didn't work. Please try again.");
    await load();
    setBusy(null);
  };

  const save = async (input: InterestInput) => {
    const target = editing?.interest;
    const result = target ? await updateInterest(target.id, input) : await createInterest(input);
    if (result.ok) await load();
    return result;
  };

  if (items === null && !error) return <SectionLoader />;

  const active = items?.filter((i) => !i.retired) ?? [];
  const retired = items?.filter((i) => i.retired) ?? [];

  const row = (item: AdminInterest, list: AdminInterest[], index: number) => (
    <li
      key={item.id}
      className={cn("flex items-center gap-3 px-3 py-2", item.retired && "opacity-60")}
    >
      <span className="w-8 shrink-0 text-center text-xl" aria-hidden>
        {item.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{item.name}</p>
        <p className="truncate text-sm text-muted-foreground">{item.slug}</p>
      </div>
      <Badge variant={item.retired ? "outline" : "secondary"} className="hidden sm:inline-flex">
        {item.retired ? "Retired" : "Active"}
      </Badge>
      <div className="flex shrink-0 items-center gap-1">
        {index > 0 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Move ${item.name} up`}
            disabled={busy !== null}
            onClick={() => run(item.id, () => moveInterest(item.id, "up"))}
          >
            <ArrowUp />
          </Button>
        )}
        {index < list.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Move ${item.name} down`}
            disabled={busy !== null}
            onClick={() => run(item.id, () => moveInterest(item.id, "down"))}
          >
            <ArrowDown />
          </Button>
        )}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${item.name}`} disabled={busy !== null}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing({ interest: item })}>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(item.id, () => setInterestRetired(item.id, !item.retired))}>
              {item.retired ? "Restore" : "Retire"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Interests</h1>
          <p className="text-sm text-muted-foreground">
            What people pick in onboarding and tag personas and channels with.
          </p>
        </div>
        <Button onClick={() => setEditing({ interest: null })}>
          <Plus />
          Add interest
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <Card>
        <CardContent className="p-1">
          {active.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">No interests yet</p>
          ) : (
            <ul className="divide-y divide-border">{active.map((item, i) => row(item, active, i))}</ul>
          )}
        </CardContent>
      </Card>
      {retired.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 text-sm font-semibold text-muted-foreground">Retired</h2>
          <Card>
            <CardContent className="p-1">
              <ul className="divide-y divide-border">{retired.map((item, i) => row(item, retired, i))}</ul>
            </CardContent>
          </Card>
        </>
      )}
      {editing && (
        <InterestDialog interest={editing.interest} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}
