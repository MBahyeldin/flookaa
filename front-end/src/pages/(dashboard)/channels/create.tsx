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
  BASE_ERROR_FIELDS,
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
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/lib/errors";

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

export default function CreateChannelPage() {
  const { t } = useTranslation(["channels", "common", "communities"]);
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
    setTheme((current) => current ?? DEFAULT_PALETTE);
  };

  const submit = async () => {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = t("create.nameMissing");
    if (interestIds.length === 0) found.interest_ids = t("common:interests.pickOneInterest");
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
      const field = BASE_ERROR_FIELDS[r.error];
      if (field) setErrors({ [field]: errorMessage(r.error) });
      else toast.error(t("create.failed"));
      return;
    }
    if (r.data.community_status === "pending" && community) {
      toast.success(t("create.pendingCommunity", { community: community.name }));
    }
    navigate(`/channels/${r.data.channel.ID}`);
  };

  const shownTheme = theme ?? community?.theme ?? DEFAULT_PALETTE;
  const facts = [
    visibility === "public" ? t("common:visibility.public") : t("common:visibility.private"),
    t("common:age.short", { age: minAge }),
  ];
  if (community) {
    facts.push(
      community.can_manage
        ? t("create.partOf", { community: community.name })
        : t("create.requestedFor", { community: community.name }),
    );
  }

  return (
    <CreatePage
      title={t("create.title")}
      lead={t("create.lead")}
      backTo="/channels"
      submitLabel={t("create.submit")}
      submitting={submitting}
      onSubmit={submit}
      preview={
        <CreatePreview
          theme={shownTheme}
          cover={cover}
          name={name}
          placeholder={t("create.previewName")}
          logo={logo}
          description={description}
          interests={interests.pick(interestIds)}
          facts={facts}
        />
      }
    >
      <SettingsSection id="basics" title={t("common:create.basics")} lead={t("create.basicsLead")}>
        <FormField label={t("fields.name")} error={errors.name} helper={t("common:create.nameHelper", { n: name.length, max: MAX_NAME })}>
          <Input
            value={name}
            maxLength={MAX_NAME}
            placeholder={t("fields.namePlaceholder")}
            onChange={(e) => {
              setName(e.target.value);
              clear("name");
            }}
          />
        </FormField>
        <FormField label={t("common:create.description")} helper={t("common:create.descriptionHelper", { n: description.length, max: MAX_DESCRIPTION })}>
          <Textarea
            value={description}
            maxLength={MAX_DESCRIPTION}
            rows={3}
            placeholder={t("fields.descriptionPlaceholder")}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
      </SettingsSection>

      <SettingsSection id="community" title={t("create.community")} lead={t("create.communityLead")}>
        {community ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-surface-sunken p-3">
            <span data-theme={community.theme}>
              <Logo name={community.name} src={community.thumbnail || null} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{community.name}</span>
              <span className="text-xs text-muted-foreground">
                {community.can_manage ? t("create.communityManaged") : t("create.communityRequest")}
              </span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
                {t("common:actions.change")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={removeCommunity}>
                {t("common:actions.remove")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
            <span className="text-sm text-muted-foreground">{t("create.noCommunity")}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
              {t("communities:picker.title")}
            </Button>
          </div>
        )}
        <CommunityPicker open={picking} onOpenChange={setPicking} value={community?.id ?? null} onPick={pickCommunity} />
      </SettingsSection>

      <SettingsSection id="look" title={t("common:look.title")} lead={t("create.lookLead")}>
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

      <SettingsSection id="audience" title={t("common:create.audience")} lead={t("create.audienceLead")}>
        <VisibilityField
          value={visibility}
          onChange={setVisibility}
          privateBody={t("create.privateBody")}
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
        lead={t("create.interestsLead")}
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
