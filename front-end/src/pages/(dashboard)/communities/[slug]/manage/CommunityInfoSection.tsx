import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SLUG_PATTERN } from "@/lib/slug";
import type { Community } from "@/types/community";
import type { SaveCommunity } from "./CommunityManageSheet";

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;
const LINK_PREFIX = "flookaa.com/communities/";

export function CommunityInfoSection({ community, save }: { community: Community; save: SaveCommunity }) {
  const [name, setName] = useState(community.name);
  const [slug, setSlug] = useState(community.slug);
  const [description, setDescription] = useState(community.description);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});

  useEffect(() => {
    setName(community.name);
    setSlug(community.slug);
    setDescription(community.description);
  }, [community.name, community.slug, community.description]);

  const changes = {
    ...(name.trim() !== community.name && { name: name.trim() }),
    ...(slug !== community.slug && { slug }),
    ...(description.trim() !== community.description && { description: description.trim() }),
  };

  const submit = async () => {
    if (!name.trim()) return setErrors({ name: "Give the community a name." });
    if (!SLUG_PATTERN.test(slug)) return setErrors({ slug: "Use 3–50 lowercase letters, digits or single hyphens." });
    setSaving(true);
    setErrors({});
    const code = await save(changes, "Community info saved");
    setSaving(false);
    if (code === "invalid_name") setErrors({ name: `Enter a name of at most ${MAX_NAME} characters.` });
    else if (code === "invalid_slug") setErrors({ slug: "Use 3–50 lowercase letters, digits or single hyphens." });
    else if (code === "slug_taken") setErrors({ slug: "Another community already uses this link." });
  };

  return (
    <SettingsSection
      id="info"
      title="Info"
      lead="Its name, link and what it's about."
      dirty={Object.keys(changes).length > 0}
      saving={saving}
      onSave={submit}
    >
      <FormField label="Community name" error={errors.name} helper={`${name.length} / ${MAX_NAME}`}>
        <Input
          value={name}
          maxLength={MAX_NAME}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((x) => ({ ...x, name: undefined }));
          }}
        />
      </FormField>
      <FormField label="Link" error={errors.slug} helper={`${LINK_PREFIX}${slug || "…"} · Old links stop working.`}>
        <Input
          value={slug}
          maxLength={50}
          onChange={(e) => {
            setSlug(e.target.value.toLowerCase());
            setErrors((x) => ({ ...x, slug: undefined }));
          }}
        />
      </FormField>
      <FormField label="Description" helper={`${description.length} / ${MAX_DESCRIPTION}`}>
        <Textarea value={description} maxLength={MAX_DESCRIPTION} rows={3} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
    </SettingsSection>
  );
}
