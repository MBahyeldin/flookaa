import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CommunityPicker } from "@/components/community-picker";
import { CreatePage } from "@/components/create-form/CreatePage";
import { CreatePreview } from "@/components/create-form/CreatePreview";
import { InterestsSection } from "@/components/create-form/InterestsSection";
import { LogoUpload } from "@/components/create-form/LogoUpload";
import {
  AgeField,
  BASE_ERRORS,
  CoverField,
  FieldError,
  ThemeField,
  VisibilityField,
  type Visibility,
} from "@/components/create-form/fields";
import { useFieldErrors } from "@/components/create-form/useFieldErrors";
import { useInterestGroups } from "@/components/create-form/useInterestGroups";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Textarea } from "@/components/ui/textarea";
import { BASE_MIN_AGE } from "@/lib/minAge";
import { createChannel } from "@/services/channels";
import { getCommunity } from "@/services/communities";
import { DEFAULT_PALETTE, type PaletteId } from "@/themes/palettes";
import type { MyCommunity } from "@/types/community";
import type { CoverPattern } from "@/types/cover";

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

export default function CreateChannelPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const communityParam = Number(searchParams.get("community")) || 0;
  const interests = useInterestGroups();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [community, setCommunity] = useState<MyCommunity | null>(null);
  const [picking, setPicking] = useState(false);
  const [logo, setLogo] = useState("");
  // null = the community's.
  const [theme, setTheme] = useState<PaletteId | null>(DEFAULT_PALETTE);
  const [cover, setCover] = useState<CoverPattern>("horizon");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [minAge, setMinAge] = useState<number>(BASE_MIN_AGE);
  const [interestIds, setInterestIds] = useState<number[]>([]);
  const { errors, setErrors, clear } = useFieldErrors();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!communityParam) return;
    let alive = true;
    getCommunity(communityParam).then((r) => {
      if (!alive || !r.ok) return;
      const c = r.data.community;
      setTheme(null);
      setCommunity({
        id: c.id,
        name: c.name,
        slug: c.slug,
        thumbnail: c.thumbnail,
        theme: c.theme,
        members_count: c.members_count,
        can_manage: !!c.can_manage,
      });
    });
    return () => {
      alive = false;
    };
  }, [communityParam]);

  const pickCommunity = (next: MyCommunity) => {
    setCommunity(next);
    setTheme(null);
  };

  const removeCommunity = () => {
    setCommunity(null);
    setTheme((t) => t ?? DEFAULT_PALETTE);
  };

  const submit = async () => {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = "Give the channel a name.";
    if (interestIds.length === 0) found.interest_ids = "Pick at least one interest.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    const r = await createChannel({
      name: name.trim(),
      description: description.trim(),
      visibility,
      min_age: minAge,
      theme: theme ?? "",
      cover_pattern: cover,
      thumbnail: logo,
      interest_ids: interestIds,
      ...(community && { community_id: community.id }),
    });
    setSubmitting(false);
    if (!r.ok) {
      const known = BASE_ERRORS[r.error];
      if (known) setErrors({ [known.field]: known.message });
      else toast.error("Couldn't create the channel. Try again.");
      return;
    }
    if (r.data.community_status === "pending" && community) {
      toast.success(`Channel created. ${community.name}'s managers will review your request to add it.`);
    }
    navigate(`/channels/${r.data.channel.ID}`);
  };

  const shownTheme = theme ?? community?.theme ?? DEFAULT_PALETTE;
  const facts = [visibility === "public" ? "Public" : "Private", `${minAge}+`];
  if (community) facts.push(community.can_manage ? `Part of ${community.name}` : `Requested for ${community.name}`);

  return (
    <CreatePage
      title="Create a channel"
      lead="Channels are where posts live. You can change all of this later."
      backTo="/channels"
      submitLabel="Create channel"
      submitting={submitting}
      onSubmit={submit}
      preview={
        <CreatePreview
          theme={shownTheme}
          cover={cover}
          name={name}
          placeholder="Your channel"
          logo={logo}
          description={description}
          interests={interests.pick(interestIds)}
          facts={facts}
        />
      }
    >
      <SettingsSection id="basics" title="Basics" lead="Name it and say what it is about.">
        <FormField label="Channel name" error={errors.name} helper={`Up to ${MAX_NAME} characters. ${name.length} / ${MAX_NAME}`}>
          <Input
            value={name}
            maxLength={MAX_NAME}
            placeholder="Night Runners"
            onChange={(e) => {
              setName(e.target.value);
              clear("name");
            }}
          />
        </FormField>
        <FormField label="Description" helper={`Shown under the name. ${description.length} / ${MAX_DESCRIPTION}`}>
          <Textarea
            value={description}
            maxLength={MAX_DESCRIPTION}
            rows={3}
            placeholder="What people find here"
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
      </SettingsSection>

      <SettingsSection id="community" title="Community" lead="Optional. A community groups channels about the same topics.">
        {community ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-surface-sunken p-3">
            <span data-theme={community.theme}>
              <Logo name={community.name} src={community.thumbnail || null} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{community.name}</span>
              <span className="text-xs text-muted-foreground">
                {community.can_manage
                  ? "You manage it, so the channel goes straight in."
                  : "Its managers review the request to add it."}
              </span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
                Change
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={removeCommunity}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
            <span className="text-sm text-muted-foreground">Not in a community.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
              Choose a community
            </Button>
          </div>
        )}
        <CommunityPicker open={picking} onOpenChange={setPicking} value={community?.id ?? null} onPick={pickCommunity} />
      </SettingsSection>

      <SettingsSection id="look" title="Look" lead="Logo, colours and cover. The preview follows your picks.">
        <LogoUpload
          name={name.trim() || "?"}
          theme={shownTheme}
          value={logo}
          error={errors.thumbnail}
          onChange={(url) => {
            setLogo(url);
            clear("thumbnail");
          }}
        />
        <ThemeField value={theme} onChange={setTheme} inherit={community?.theme} />
        <FieldError>{errors.theme}</FieldError>
        <CoverField value={cover} onChange={setCover} />
        <FieldError>{errors.cover_pattern}</FieldError>
      </SettingsSection>

      <SettingsSection id="audience" title="Audience" lead="Who reads it, and how old they must be.">
        <VisibilityField
          value={visibility}
          onChange={setVisibility}
          privateBody="Only members read. Joining needs your or a moderator's approval."
        />
        <AgeField
          value={minAge}
          error={errors.min_age}
          onChange={(age) => {
            setMinAge(age);
            clear("min_age");
          }}
        />
      </SettingsSection>

      <InterestsSection
        lead="Pick 1 to 5. People find the channel by them."
        groups={interests.groups}
        onRetry={interests.retry}
        value={interestIds}
        error={errors.interest_ids}
        onChange={(ids) => {
          setInterestIds(ids);
          clear("interest_ids");
        }}
      />
    </CreatePage>
  );
}
