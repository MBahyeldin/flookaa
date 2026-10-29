import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BASE_MIN_AGE } from "@/lib/minAge";
import { SLUG_PATTERN, slugify } from "@/lib/slug";
import { createCommunity } from "@/services/communities";
import { DEFAULT_PALETTE, type PaletteId } from "@/themes/palettes";
import type { CoverPattern } from "@/types/cover";

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;
const MAX_RULES = 5000;
const LINK_PREFIX = "flookaa.com/communities/";

const ERRORS: Record<string, { field: string; message: string }> = {
  ...BASE_ERRORS,
  invalid_slug: { field: "slug", message: "Use 3–50 lowercase letters, digits or single hyphens." },
  slug_taken: { field: "slug", message: "Another community already uses this link." },
  invalid_rules: { field: "rules", message: `Use at most ${MAX_RULES} characters.` },
};

export default function CreateCommunityPage() {
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

  const submit = async () => {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = "Give the community a name.";
    if (!SLUG_PATTERN.test(link)) found.slug = ERRORS.invalid_slug.message;
    if (interestIds.length === 0) found.interest_ids = "Pick at least one interest.";
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
      const known = ERRORS[r.error];
      if (known) setErrors({ [known.field]: known.message });
      else toast.error("Couldn't create the community. Try again.");
      return;
    }
    navigate(`/communities/${r.data.community.slug}`);
  };

  return (
    <CreatePage
      title="Create a community"
      lead="A community groups channels about the same topics. You can add channels once it exists."
      backTo="/communities"
      submitLabel="Create community"
      submitting={submitting}
      onSubmit={submit}
      preview={
        <CreatePreview
          theme={theme}
          cover={cover}
          name={name}
          placeholder="Your community"
          logo={logo}
          description={description}
          interests={interests.pick(interestIds)}
          facts={[visibility === "public" ? "Public" : "Private", `${minAge}+`]}
        />
      }
    >
      <SettingsSection id="basics" title="Basics" lead="Name it, give it a link and say what it is about.">
        <FormField label="Community name" error={errors.name} helper={`Up to ${MAX_NAME} characters. ${name.length} / ${MAX_NAME}`}>
          <Input
            value={name}
            maxLength={MAX_NAME}
            placeholder="City Sports"
            onChange={(e) => {
              setName(e.target.value);
              clear("name");
              if (slug === null) clear("slug");
            }}
          />
        </FormField>
        <FormField label="Link" error={errors.slug} helper={`${LINK_PREFIX}${link || "…"}`}>
          <Input
            value={link}
            maxLength={50}
            placeholder="city-sports"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              clear("slug");
            }}
          />
        </FormField>
        <FormField label="Description" helper={`Shown under the name. ${description.length} / ${MAX_DESCRIPTION}`}>
          <Textarea
            value={description}
            maxLength={MAX_DESCRIPTION}
            rows={3}
            placeholder="What brings people here"
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
      </SettingsSection>

      <SettingsSection id="rules" title="Rules" lead="Optional. Shown before anyone joins.">
        <FormField label="Rules" error={errors.rules} helper={`One rule per line. ${rules.length} / ${MAX_RULES}`}>
          <Textarea
            value={rules}
            rows={5}
            placeholder={"Be kind.\nStay on topic."}
            onChange={(e) => {
              setRules(e.target.value);
              clear("rules");
            }}
          />
        </FormField>
      </SettingsSection>

      <SettingsSection id="look" title="Look" lead="Logo, colours and cover. Its channels use these colours unless they pick their own.">
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
        <ThemeField value={theme} onChange={(t) => setTheme(t ?? DEFAULT_PALETTE)} />
        <FieldError>{errors.theme}</FieldError>
        <CoverField value={cover} onChange={setCover} />
        <FieldError>{errors.cover_pattern}</FieldError>
      </SettingsSection>

      <SettingsSection id="audience" title="Audience" lead="Who sees inside it, and how old they must be.">
        <VisibilityField
          value={visibility}
          onChange={setVisibility}
          privateBody="Only members see its channels and people. Joining needs a manager's approval."
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
        lead="Pick 1 to 5. People find the community by them."
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
