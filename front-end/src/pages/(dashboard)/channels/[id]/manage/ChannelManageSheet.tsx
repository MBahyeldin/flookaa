import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InterestsManageSection } from "@/components/manage/InterestsManageSection";
import { LookSection, type Look } from "@/components/manage/LookSection";
import { ManageSheet } from "@/components/manage/ManageSheet";
import type { GetChannelQuery } from "@/generated/graphql";
import { setChannelInterests, updateChannel } from "@/services/channels";
import { getChannelCommunity } from "@/services/communities";
import { isPaletteId, type PaletteId } from "@/themes/palettes";
import type { ChannelCommunityState } from "@/types/community";
import type { CoverPattern } from "@/types/cover";
import type { Interest } from "@/types/interest";
import { ChannelAudienceSection } from "./ChannelAudienceSection";
import { ChannelCommunitySection } from "./ChannelCommunitySection";
import { ChannelInfoSection } from "./ChannelInfoSection";
import { useTranslation } from "react-i18next";

type Channel = NonNullable<GetChannelQuery["getChannel"]>;


/** communityKey changes when the page hears the channel's community row changed. */
export function ChannelManageSheet({
  channel,
  interests,
  open,
  onOpenChange,
  communityKey,
  onChanged,
  onInterestsSaved,
}: {
  channel: Channel;
  interests: Interest[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityKey: number;
  onChanged: () => void;
  onInterestsSaved: (interests: Interest[]) => void;
}) {
  const { t } = useTranslation(["channels", "common"]);
  const sections = [
    { id: "info", label: t("manage.info") },
    { id: "look", label: t("common:look.title") },
    { id: "interests", label: t("common:interests.label") },
    { id: "audience", label: t("common:create.audience") },
    { id: "community", label: t("create.community") },
  ] as const;
  const channelId = String(channel.id);
  const [community, setCommunity] = useState<ChannelCommunityState | null | undefined>(undefined);

  const loadCommunity = useCallback(async () => {
    setCommunity(undefined);
    const r = await getChannelCommunity(channelId);
    setCommunity(r.ok ? r.data : null);
  }, [channelId]);

  useEffect(() => {
    if (open) loadCommunity();
  }, [open, loadCommunity, communityKey]);

  const theme = channel.theme as PaletteId;
  const look = useMemo<Look>(
    () => ({
      thumbnail: channel.thumbnailUrl ?? "",
      theme: isPaletteId(channel.ownTheme) ? channel.ownTheme : null,
      cover_pattern: channel.coverPattern as CoverPattern,
    }),
    [channel.thumbnailUrl, channel.ownTheme, channel.coverPattern],
  );
  const inherit = community?.status === "active" ? community.community?.theme : undefined;

  const saveLook = async (changes: Partial<Look>) => {
    const { theme, ...rest } = changes;
    const r = await updateChannel(channelId, { ...rest, ...(theme !== undefined && { theme: theme ?? "" }) });
    if (!r.ok) {
      if (!r.error.startsWith("invalid_")) toast.error(t("common:look.saveFailed"));
      return r.error;
    }
    toast.success(t("common:look.saved"));
    onChanged();
    return null;
  };

  const saveInterests = async (ids: number[]) => {
    const r = await setChannelInterests(channelId, ids);
    if (!r.ok) {
      if (!r.error.startsWith("invalid_")) toast.error(t("common:interests.saveFailed"));
      return r.error;
    }
    onInterestsSaved(r.data.interests);
    toast.success(t("common:interests.saved"));
    return null;
  };

  return (
    <ManageSheet
      open={open}
      onOpenChange={onOpenChange}
      theme={theme}
      name={channel.name}
      logo={channel.thumbnailUrl ?? ""}
      sections={sections}
    >
      <ChannelInfoSection channelId={channelId} name={channel.name} description={channel.description ?? ""} onSaved={onChanged} />
      <LookSection
        look={look}
        inherit={inherit}
        name={channel.name}
        description={channel.description ?? ""}
        interests={interests}
        facts={[
          channel.isPrivate ? t("common:visibility.private") : t("common:visibility.public"),
          t("common:age.short", { age: channel.minAge }),
        ]}
        lead={t("create.lookLead")}
        onSave={saveLook}
      />
      <InterestsManageSection lead={t("create.interestsLead")} current={interests} onSave={saveInterests} />
      <ChannelAudienceSection channelId={channelId} minAge={channel.minAge} isPrivate={channel.isPrivate} onSaved={onChanged} />
      <ChannelCommunitySection channelId={channelId} state={community} onRetry={loadCommunity} onChanged={loadCommunity} />
    </ManageSheet>
  );
}
