import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SLUG_PATTERN } from "@/lib/slug";
import type { Community } from "@/types/community";
import type { SaveCommunity } from "./CommunityManageSheet";
import { useTranslation } from "react-i18next";

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;
const LINK_PREFIX = "flookaa.com/communities/";

export function CommunityInfoSection({ community, save }: { community: Community; save: SaveCommunity }) {
  const { t } = useTranslation(["communities", "common", "channels"]);
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
    if (!name.trim()) return setErrors({ name: t("create.nameMissing") });
    if (!SLUG_PATTERN.test(slug)) return setErrors({ slug: t("create.invalidSlug") });
    setSaving(true);
    setErrors({});
    const code = await save(changes, t("info.saved"));
    setSaving(false);
    if (code === "invalid_name") setErrors({ name: t("channels:manage.nameTooLong", { max: MAX_NAME }) });
    else if (code === "invalid_slug") setErrors({ slug: t("create.invalidSlug") });
    else if (code === "slug_taken") setErrors({ slug: t("create.slugTaken") });
  };

  return (
    <SettingsSection
      id="info"
      title={t("channels:manage.info")}
      lead={t("info.lead")}
      dirty={Object.keys(changes).length > 0}
      saving={saving}
      onSave={submit}
    >
      <FormField label={t("fields.name")} error={errors.name} helper={t("common:interests.count", { n: name.length, max: MAX_NAME })}>
        <Input
          value={name}
          maxLength={MAX_NAME}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((x) => ({ ...x, name: undefined }));
          }}
        />
      </FormField>
      <FormField label={t("fields.link")} error={errors.slug} helper={t("info.linkHelper", { link: `${LINK_PREFIX}${slug || "…"}` })}>
        <Input
          value={slug}
          maxLength={50}
          onChange={(e) => {
            setSlug(e.target.value.toLowerCase());
            setErrors((x) => ({ ...x, slug: undefined }));
          }}
        />
      </FormField>
      <FormField label={t("common:create.description")} helper={t("common:interests.count", { n: description.length, max: MAX_DESCRIPTION })}>
        <Textarea value={description} maxLength={MAX_DESCRIPTION} rows={3} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
    </SettingsSection>
  );
}
