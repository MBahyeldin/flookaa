import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CircleAlert,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Tags,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
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

type Direction = "up" | "down";

export default function AdminInterestsPage() {
  const { user } = useAuth();
  if (!user?.is_admin) return <NotFound />;
  return <InterestsAdmin />;
}

function Header({ actions }: { actions?: ReactNode }) {
  const { t } = useTranslation(["admin", "common"]);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-overline font-semibold text-muted-foreground uppercase">{t("common:nav.admin")}</p>
        <h1 className="text-h1 font-semibold tracking-tight">{t("interests.title")}</h1>
        <p className="max-w-md text-muted-foreground">{t("interests.lead")}</p>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

// Hidden ends keep their slot so the arrows stay in columns.
function MoveButtons({
  label,
  first,
  last,
  disabled,
  onMove,
  className,
}: {
  label: string;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onMove: (direction: Direction) => void;
  className?: string;
}) {
  const { t } = useTranslation("admin");
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("interests.moveUpNamed", { name: label })}
        disabled={disabled}
        className={cn(first && "invisible")}
        onClick={() => onMove("up")}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("interests.moveDownNamed", { name: label })}
        disabled={disabled}
        className={cn(last && "invisible")}
        onClick={() => onMove("down")}
      >
        <ArrowDown />
      </Button>
    </div>
  );
}

function SectionCard({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">{children}</section>;
}

function InterestsAdmin() {
  const { t } = useTranslation(["admin", "common"]);
  const [catalogue, setCatalogue] = useState<AdminCatalogue | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);

  const load = useCallback(async () => {
    const result = await adminListInterests();
    if (result.ok) {
      setCatalogue(result.data);
      setLoadFailed(false);
    } else {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<{ ok: boolean }>) => {
    setBusy(true);
    setActionFailed(false);
    const result = await action();
    await load();
    if (!result.ok) setActionFailed(true);
    setBusy(false);
  };

  const column = "mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8 md:py-12";

  if (catalogue === null) {
    return (
      <div className={column}>
        <Header />
        {loadFailed ? (
          <ErrorState
            title={t("common:interests.loadFailed")}
            onRetry={() => {
              setLoadFailed(false);
              load();
            }}
          />
        ) : (
          <SkeletonList count={6} />
        )}
      </div>
    );
  }

  const groups = catalogue.groups ?? [];
  const interests = catalogue.interests ?? [];
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const active = interests.filter((i) => !i.retired);
  const ungrouped = active.filter((i) => i.group_id === null || !groupName.has(i.group_id));
  const retired = interests.filter((i) => i.retired);

  const addGroup = () => setEditing({ kind: "group", group: null });
  const addInterest = (groupId: number | null) => setEditing({ kind: "interest", interest: null, groupId });
  const edit = (item: AdminInterest) => setEditing({ kind: "interest", interest: item, groupId: item.group_id });

  const rowMenu = (item: AdminInterest, move?: { first: boolean; last: boolean }) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("common:manage.actionsFor", { name: item.name })} disabled={busy}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item.retired ? (
          <DropdownMenuItem onSelect={() => run(() => setInterestRetired(item.id, false))}>
            <RotateCcw />
            {t("interests.restore")}
          </DropdownMenuItem>
        ) : (
          <>
            {move && !move.first && (
              <DropdownMenuItem className="sm:hidden" onSelect={() => run(() => moveInterest(item.id, "up"))}>
                <ArrowUp />
                {t("interests.moveUp")}
              </DropdownMenuItem>
            )}
            {move && !move.last && (
              <DropdownMenuItem className="sm:hidden" onSelect={() => run(() => moveInterest(item.id, "down"))}>
                <ArrowDown />
                {t("interests.moveDown")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => edit(item)}>
              <Pencil />
              {t("interests.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(() => setInterestRetired(item.id, true))}>
              <Archive />
              {t("interests.retire")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const rows = (items: AdminInterest[], { movable = false } = {}) => (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => {
        const move = movable ? { first: i === 0, last: i === items.length - 1 } : undefined;
        return (
          <li key={item.id} className="flex min-h-10 items-center gap-3">
            <Chip emoji={item.emoji} className={cn(item.retired && "opacity-60")}>
              {item.name}
            </Chip>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-muted-foreground">{item.slug}</p>
              {item.retired && item.group_id !== null && groupName.has(item.group_id) && (
                <p className="truncate text-xs text-muted-foreground">{t("interests.inGroup", { group: groupName.get(item.group_id) })}</p>
              )}
            </div>
            {item.retired && (
              <Badge variant="secondary">
                <Archive />
                {t("interests.retired")}
              </Badge>
            )}
            {move && (
              <MoveButtons
                className="hidden sm:flex"
                label={item.name}
                first={move.first}
                last={move.last}
                disabled={busy}
                onMove={(d) => run(() => moveInterest(item.id, d))}
              />
            )}
            {rowMenu(item, move)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={column}>
      <Header
        actions={
          <>
            <Button variant="secondary" disabled={busy} onClick={addGroup}>
              <Plus />
              {t("interests.addGroup")}
            </Button>
            {groups.length > 0 && (
              <Button disabled={busy} onClick={() => addInterest(null)}>
                <Plus />
                {t("interests.addInterest")}
              </Button>
            )}
          </>
        }
      />
      {actionFailed && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive px-4 py-3 text-sm text-foreground"
        >
          <CircleAlert className="size-4 shrink-0 text-destructive" />
          {t("interests.actionFailed")}
        </div>
      )}
      {groups.length === 0 && (
        <EmptyState
          icon={Tags}
          title={t("interests.emptyTitle")}
          body={t("interests.emptyBody")}
          action={
            <Button disabled={busy} onClick={addGroup}>
              {t("interests.addGroup")}
            </Button>
          }
        />
      )}
      {groups.map((group, gi) => {
        const items = active.filter((i) => i.group_id === group.id);
        return (
          <SectionCard key={group.id}>
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                <h2 className="text-h4 min-w-0 font-medium break-words max-sm:w-full">{group.name}</h2>
                <span className="truncate text-sm text-muted-foreground">{group.slug}</span>
                <Badge variant="secondary">
                  {items.length} {items.length === 1 ? "interest" : "interests"}
                </Badge>
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
                size="icon-sm"
                aria-label={t("interests.editNamed", { name: group.name })}
                disabled={busy}
                onClick={() => setEditing({ kind: "group", group })}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("interests.addInterestTo", { name: group.name })}
                disabled={busy}
                onClick={() => addInterest(group.id)}
              >
                <Plus />
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {t("interests.emptyTitle")}
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => addInterest(group.id)}>
                  <Plus />
                  {t("interests.addInterest")}
                </Button>
              </div>
            ) : (
              rows(items, { movable: true })
            )}
          </SectionCard>
        );
      })}
      {ungrouped.length > 0 && (
        <SectionCard>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-h4 font-medium">{t("interests.needsGroup")}</h2>
              <Badge variant="secondary">{ungrouped.length}</Badge>
            </div>
            <p className="flex items-start gap-2 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              {t("interests.needsGroupBody")}
            </p>
          </div>
          {rows(ungrouped)}
        </SectionCard>
      )}
      {retired.length > 0 && (
        <SectionCard>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-h4 font-medium">{t("interests.retired")}</h2>
              <Badge variant="secondary">{retired.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("interests.retiredBody")}
            </p>
          </div>
          {rows(retired)}
        </SectionCard>
      )}
      {editing?.kind === "interest" && (
        <CatalogueDialog
          adding={!editing.interest}
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
          adding={!editing.group}
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
