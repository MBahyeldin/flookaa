import { useMemo } from "react";
import { toast } from "sonner";
import { InterestsManageSection } from "@/components/manage/InterestsManageSection";
import { LookSection, type Look } from "@/components/manage/LookSection";
import { ManageSheet } from "@/components/manage/ManageSheet";
import { updateCommunity, type CommunityChanges } from "@/services/communities";
import { DEFAULT_PALETTE } from "@/themes/palettes";
import type { Community } from "@/types/community";
import { CommunityAudienceSection } from "./CommunityAudienceSection";
import { CommunityInfoSection } from "./CommunityInfoSection";
import { CommunityRulesSection } from "./CommunityRulesSection";

const SECTIONS = [
  { id: "info", label: "Info" },
  { id: "look", label: "Look" },
  { id: "interests", label: "Interests" },
  { id: "rules", label: "Rules" },
  { id: "audience", label: "Audience" },
] as const;

export type SaveCommunity = (changes: CommunityChanges, success: string) => Promise<string | null>;

export function CommunityManageSheet({
  community,
  pendingRequests,
  open,
  onOpenChange,
  onSaved,
}: {
  community: Community;
  pendingRequests: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (community: Community) => void;
}) {
  // Field codes come back to the section; anything else is a toast here.
  const save: SaveCommunity = async (changes, success) => {
    const r = await updateCommunity(community.id, changes);
    if (!r.ok) {
      if (!r.error.startsWith("invalid_") && r.error !== "slug_taken") toast.error("Couldn't save. Try again.");
      return r.error;
    }
    toast.success(success);
    if (r.data?.community) onSaved(r.data.community);
    return null;
  };

  const look = useMemo<Look>(
    () => ({ thumbnail: community.thumbnail, theme: community.theme, cover_pattern: community.cover_pattern }),
    [community.thumbnail, community.theme, community.cover_pattern],
  );

  return (
    <ManageSheet
      open={open}
      onOpenChange={onOpenChange}
      theme={community.theme}
      name={community.name}
      logo={community.thumbnail}
      sections={SECTIONS}
    >
      <CommunityInfoSection community={community} save={save} />
      <LookSection
        look={look}
        name={community.name}
        description={community.description}
        interests={community.interests}
        facts={[community.visibility === "public" ? "Public" : "Private", `${community.min_age}+`]}
        lead="Logo, colours and cover. Its channels use these colours unless they pick their own."
        onSave={({ theme, ...rest }) =>
          save({ ...rest, ...(theme !== undefined && { theme: theme ?? DEFAULT_PALETTE }) }, "Look saved")
        }
      />
      <InterestsManageSection
        lead="Pick 1 to 5. People find the community by them."
        current={community.interests}
        onSave={(ids) => save({ interest_ids: ids }, "Interests saved")}
      />
      <CommunityRulesSection rules={community.rules} save={save} />
      <CommunityAudienceSection community={community} pendingRequests={pendingRequests} save={save} />
    </ManageSheet>
  );
}
