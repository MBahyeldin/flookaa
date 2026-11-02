import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BASE_MIN_AGE } from "@/lib/minAge";
import { SLUG_PATTERN, slugify } from "@/lib/slug";
import { createCommunity } from "@/services/communities";
import { DEFAULT_PALETTE, type PaletteId } from "@/themes/palettes";
import type { CoverPattern } from "@/types/cover";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/lib/errors";

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;
const MAX_RULES = 5000;
const LINK_PREFIX = "flookaa.com/communities/";

const ERROR_FIELDS: Record<string, string> = {
  ...BASE_ERROR_FIELDS,
  invalid_slug: "slug",
  slug_taken: "slug",
  invalid_rules: "rules",
};

export default function CreateCommunityPage() {
  const { t } = useTranslation(["communities", "common"]);
  const navigate = useNavigate();
  const interests = useInterestGroups();

  const [name, setName] = useState("");
  // The link follows the name until it's edited.
  const [slug, setSlug] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [logo, setLogo] = useState("");
  const [theme, setTheme] = useState<PaletteId>(DEFAULT_PALETTE);
  const [cover, setCover] = useState<CoverPattern>("horizon");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [minAge, setMinAge] = useState<number>(BASE_MIN_AGE);
  const [interestIds, setInterestIds] = useState<number[]>([]);
  const { errors, setErrors, clear } = useFieldErrors();
  const [submitting, setSubmitting] = useState(false);

  const link = slug ?? slugify(name);

  const fieldError = (code: string) =>
    code === "invalid_slug"
      ? t("create.invalidSlug")
      : code === "slug_taken"
        ? t("create.slugTaken")
        : code === "invalid_rules"
          ? t("rules.tooLong", { max: MAX_RULES })
          : errorMessage(code);

  const submit = async () => {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = t("create.nameMissing");
    if (!SLUG_PATTERN.test(link)) found.slug = t("create.invalidSlug");
    if (interestIds.length === 0) found.interest_ids = t("common:interests.pickOneInterest");
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    const r = await createCommunity({
      name: name.trim(),
      slug: link,
      description: description.trim(),
      rules: rules.trim(),
      visibility,
      min_age: minAge,
      theme,
      cover_pattern: cover,
      thumbnail: logo,
      interest_ids: interestIds,
    });
    setSubmitting(false);
    if (!r.ok) {
      const field = ERROR_FIELDS[r.error];
      if (field) setErrors({ [field]: fieldError(r.error) });
      else toast.error(t("create.failed"));
      return;
    }
    navigate(`/communities/${r.data.community.slug}`);
  };

  return (
    <CreatePage
      title={t("create.title")}
      lead={t("create.lead")}
      backTo="/communities"
      submitLabel={t("create.submit")}
      submitting={submitting}
      onSubmit={submit}
      preview={
        <CreatePreview
          theme={theme}
          cover={cover}
          name={name}
          placeholder={t("create.previewName")}
          logo={logo}
          description={description}
          interests={interests.pick(interestIds)}
          facts={[
            visibility === "public" ? t("common:visibility.public") : t("common:visibility.private"),
            t("common:age.short", { age: minAge }),
          ]}
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
              if (slug === null) clear("slug");
            }}
          />
        </FormField>
        <FormField label={t("fields.link")} error={errors.slug} helper={`${LINK_PREFIX}${link || "…"}`}>
          <Input
            value={link}
            maxLength={50}
            placeholder={t("fields.linkPlaceholder")}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              clear("slug");
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

      <SettingsSection id="rules" title={t("rules.title")} lead={t("rules.lead")}>
        <FormField label={t("rules.title")} error={errors.rules} helper={t("rules.helper", { n: rules.length, max: MAX_RULES })}>
          <Textarea
            value={rules}
            rows={5}
            placeholder={t("rules.placeholder")}
            onChange={(e) => {
              setRules(e.target.value);
              clear("rules");
            }}
          />
        </FormField>
      </SettingsSection>

      <SettingsSection id="look" title={t("common:look.title")} lead={t("create.lookLead")}>
        <LogoUpload
          name={name.trim() || "?"}
          theme={theme}
          value={logo}
          error={errors.thumbnail}
          onChange={(url) => {
            setLogo(url);
            clear("thumbnail");
          }}
        />
        <ThemeField value={theme} onChange={(next) => setTheme(next ?? DEFAULT_PALETTE)} />
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
