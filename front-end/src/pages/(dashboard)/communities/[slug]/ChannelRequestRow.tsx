import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { PersonaLink } from "@/components/persona-link";
import { displayName } from "@/components/persona-link/PersonRow";
import type { CommunityChannelRequest } from "@/types/community";
import { formatDateOnly } from "@/lib/format";
import { Trans, useTranslation } from "react-i18next";

export default function ChannelRequestRow({
  request,
  busy,
  onResolve,
}: {
  request: CommunityChannelRequest;
  busy: boolean;
  onResolve: (decision: "approve" | "reject") => void;
}) {
  const { t } = useTranslation(["communities", "common"]);
  const by = request.requested_by;
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span data-theme={request.theme} className="shrink-0">
        <Logo name={request.name} src={request.thumbnail || null} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <Link to={`/channels/${request.channel_id}`} className="flex items-center gap-1 text-sm font-semibold hover:underline">
          <span className="truncate">{request.name}</span>
          {request.visibility === "private" && <Lock className="size-3 shrink-0 text-muted-foreground" aria-label={t("common:visibility.private")} />}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {by && (
            <>
              <Trans
                t={t}
                i18nKey="requests.askedBy"
                values={{ name: displayName(by) }}
                components={{
                  persona: (
                    <PersonaLink
                      personaId={by.persona_id}
                      anonymous={by.anonymous}
                      name={displayName(by)}
                      thumbnail={by.thumbnail || undefined}
                      className="font-medium text-foreground hover:underline"
                    >
                      {displayName(by)}
                    </PersonaLink>
                  ),
                }}
              />
              {" · "}
            </>
          )}
          {formatDateOnly(request.requested_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" disabled={busy} onClick={() => onResolve("approve")}>
          {t("common:actions.approve")}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onResolve("reject")}>
          {t("common:actions.reject")}
        </Button>
      </div>
    </li>
  );
}
