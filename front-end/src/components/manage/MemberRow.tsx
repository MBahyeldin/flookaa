import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonRow, displayName, type RowPerson } from "@/components/persona-link/PersonRow";
import { t } from "@/i18n";

export type MemberAction = { label: string; destructive?: boolean; run: () => void };

export function MemberRow({
  person,
  detail,
  role,
  actions,
  busy,
}: {
  person: RowPerson;
  detail: string;
  role?: "Owner" | "Moderator";
  actions: MemberAction[];
  busy: boolean;
}) {
  const plain = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);
  return (
    <PersonRow person={person} detail={detail} badge={role && (role === "Owner" ? t("common:roles.owner") : t("common:roles.moderator"))}>
      {actions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={t("common:manage.actionsFor", { name: displayName(person) })} disabled={busy}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {plain.map((a) => (
              <DropdownMenuItem key={a.label} onSelect={a.run}>
                {a.label}
              </DropdownMenuItem>
            ))}
            {plain.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
            {destructive.map((a) => (
              <DropdownMenuItem key={a.label} variant="destructive" onSelect={a.run}>
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </PersonRow>
  );
}
