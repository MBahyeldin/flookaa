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

type Channel = NonNullable<GetChannelQuery["getChannel"]>;

const SECTIONS = [
  { id: "info", label: "Info" },
  { id: "look", label: "Look" },
  { id: "interests", label: "Interests" },
  { id: "audience", label: "Audience" },
  { id: "community", label: "Community" },
] as const;

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
      if (!r.error.startsWith("invalid_")) toast.error("Couldn't save the look. Try again.");
      return r.error;
    }
    toast.success("Look saved");
    onChanged();
    return null;
  };

  const saveInterests = async (ids: number[]) => {
    const r = await setChannelInterests(channelId, ids);
    if (!r.ok) {
      if (!r.error.startsWith("invalid_")) toast.error("Couldn't save the interests. Try again.");
      return r.error;
    }
    onInterestsSaved(r.data.interests);
    toast.success("Interests saved");
    return null;
  };

  return (
    <ManageSheet
      open={open}
      onOpenChange={onOpenChange}
      theme={theme}
      name={channel.name}
      logo={channel.thumbnailUrl ?? ""}
      sections={SECTIONS}
    >
      <ChannelInfoSection channelId={channelId} name={channel.name} description={channel.description ?? ""} onSaved={onChanged} />
      <LookSection
        look={look}
        inherit={inherit}
        name={channel.name}
        description={channel.description ?? ""}
        interests={interests}
        facts={[channel.isPrivate ? "Private" : "Public", `${channel.minAge}+`]}
        lead="Logo, colours and cover. The preview follows your picks."
        onSave={saveLook}
      />
      <InterestsManageSection lead="Pick 1 to 5. People find the channel by them." current={interests} onSave={saveInterests} />
      <ChannelAudienceSection channelId={channelId} minAge={channel.minAge} isPrivate={channel.isPrivate} onSaved={onChanged} />
      <ChannelCommunitySection channelId={channelId} state={community} onRetry={loadCommunity} onChanged={loadCommunity} />
    </ManageSheet>
  );
}
