import { useEffect, useState } from "react";
import { Globe, Lock, TriangleAlert } from "lucide-react";
import { AgeField, VisibilityField, type Visibility } from "@/components/create-form/fields";
import { useConfirm } from "@/components/confirm-dialog";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { errorMessage } from "@/lib/errors";
import { formatCompact } from "@/lib/format";
import type { Community } from "@/types/community";
import type { SaveCommunity } from "./CommunityManageSheet";
import { useTranslation } from "react-i18next";

export function CommunityAudienceSection({
  community,
  pendingRequests,
  save,
}: {
  community: Community;
  pendingRequests: number;
  save: SaveCommunity;
}) {
  const { t } = useTranslation(["communities", "common"]);
  const [visibility, setVisibility] = useState<Visibility>(community.visibility);
  const [minAge, setMinAge] = useState(community.min_age);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => setVisibility(community.visibility), [community.visibility]);
  useEffect(() => setMinAge(community.min_age), [community.min_age]);

  const visibilityChanged = visibility !== community.visibility;
  const warning = !visibilityChanged
    ? null
    : visibility === "private"
      ? community.followers_count > 0
        ? t("audience.privateEndsFollows", { count: community.followers_count, n: formatCompact(community.followers_count) })
        : t("audience.privateHides")
      : pendingRequests > 0
        ? t("audience.publicAdmits", { count: pendingRequests, n: formatCompact(pendingRequests) })
        : t("audience.publicOpens");

  const submit = async () => {
    if (
      visibilityChanged &&
      !(await confirm({
        title:
          visibility === "private"
            ? t("audience.makePrivateConfirm", { name: community.name })
            : t("audience.makePublicConfirm", { name: community.name }),
        body: warning,
        confirmLabel: visibility === "private" ? t("audience.makePrivate") : t("audience.makePublic"),
      }))
    )
      return;
    setSaving(true);
    setError(undefined);
    const code = await save(
      { ...(visibilityChanged && { visibility }), ...(minAge !== community.min_age && { min_age: minAge }) },
      t("audience.saved"),
    );
    setSaving(false);
    if (code === "invalid_min_age") setError(errorMessage(code));
  };

  const Icon = community.visibility === "private" ? Lock : Globe;
  return (
    <SettingsSection
      id="audience"
      title={t("common:create.audience")}
      lead={t("create.audienceLead")}
      dirty={visibilityChanged || minAge !== community.min_age}
      saving={saving}
      onSave={submit}
    >
      {community.can_own ? (
        <VisibilityField value={visibility} onChange={setVisibility} privateBody={t("audience.privateBody")} />
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("common:create.visibility")}</span>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              <Icon />
              {community.visibility === "private" ? t("common:visibility.private") : t("common:visibility.public")}
            </Badge>
            {t("audience.ownerOnly")}
          </div>
        </div>
      )}
      {warning && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          {warning}
        </p>
      )}
      <AgeField
        value={minAge}
        error={error}
        helper={t("common:age.manageHelper")}
        onChange={(age) => {
          setMinAge(age);
          setError(undefined);
        }}
      />
      {confirmDialog}
    </SettingsSection>
  );
}
