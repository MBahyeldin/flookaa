import { useEffect, useState } from "react";
import { Globe, Lock, TriangleAlert } from "lucide-react";
import { AgeField, VisibilityField, type Visibility } from "@/components/create-form/fields";
import { useConfirm } from "@/components/confirm-dialog";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { MIN_AGE_ERROR } from "@/lib/minAge";
import { formatCount } from "@/lib/format";
import type { Community } from "@/types/community";
import type { SaveCommunity } from "./CommunityManageSheet";

const PRIVATE_BODY = "Only members see inside. Joining needs a manager's approval.";

export function CommunityAudienceSection({
  community,
  pendingRequests,
  save,
}: {
  community: Community;
  pendingRequests: number;
  save: SaveCommunity;
}) {
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
        ? `Going private ends ${formatCount(community.followers_count, "follow", "follows")}. Members stay.`
        : "Going private hides the members and channels list from everyone outside."
      : pendingRequests > 0
        ? `Going public admits ${formatCount(pendingRequests, "pending request", "pending requests")} at once.`
        : "Going public lets anyone see inside and join at once.";

  const submit = async () => {
    if (
      visibilityChanged &&
      !(await confirm({
        title: visibility === "private" ? `Make ${community.name} private?` : `Make ${community.name} public?`,
        body: warning,
        confirmLabel: visibility === "private" ? "Make private" : "Make public",
      }))
    )
      return;
    setSaving(true);
    setError(undefined);
    const code = await save(
      { ...(visibilityChanged && { visibility }), ...(minAge !== community.min_age && { min_age: minAge }) },
      "Audience saved",
    );
    setSaving(false);
    if (code === "invalid_min_age") setError(MIN_AGE_ERROR);
  };

  const Icon = community.visibility === "private" ? Lock : Globe;
  return (
    <SettingsSection
      id="audience"
      title="Audience"
      lead="Who sees inside it, and how old they must be."
      dirty={visibilityChanged || minAge !== community.min_age}
      saving={saving}
      onSave={submit}
    >
      {community.can_own ? (
        <VisibilityField value={visibility} onChange={setVisibility} privateBody={PRIVATE_BODY} />
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Visibility</span>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              <Icon />
              {community.visibility === "private" ? "Private" : "Public"}
            </Badge>
            Only the owner can change this.
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
        helper="Younger people won't see it at all, members included."
        onChange={(age) => {
          setMinAge(age);
          setError(undefined);
        }}
      />
      {confirmDialog}
    </SettingsSection>
  );
}
