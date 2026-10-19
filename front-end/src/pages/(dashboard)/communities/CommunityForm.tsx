import { useCallback, useMemo, useRef } from "react";
import { Save } from "lucide-react";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import { Form } from "@/models/Forms/Form";
import { slugify } from "@/lib/slug";
import type { Community } from "@/types/community";

/** Create when community is absent, otherwise edit it. */
export default function CommunityForm({
  community,
  onSaved,
}: {
  community?: Community;
  onSaved: (community: Community | null) => void;
}) {
  const canOwn = !community || !!community.can_own;
  const form = useMemo(() => Form.community(community?.id, canOwn), [community?.id, canOwn]);
  const initialValues = useMemo(
    () =>
      community
        ? {
            name: community.name,
            slug: community.slug,
            description: community.description,
            rules: community.rules,
            visibility: community.visibility,
            thumbnail: community.thumbnail,
            banner: community.banner,
            interest_ids: community.interests.map((i) => i.id),
          }
        : { visibility: "public", interest_ids: [] },
    [community],
  );

  // On create the slug follows the name until the slug is edited.
  const autoSlug = useRef("");
  const derive = useCallback(
    (values: Record<string, unknown>) => {
      if (community) return null;
      const slug = (values.slug as string | undefined) ?? "";
      if (slug !== autoSlug.current) return null;
      autoSlug.current = slugify((values.name as string | undefined) ?? "");
      return { slug: autoSlug.current };
    },
    [community],
  );

  const onStatusChange = useCallback(
    (status: { success: boolean; error: string | null; result: unknown }) => {
      if (!status.success) return;
      // A PATCH with no changes succeeds without a body.
      const saved = (status.result as { community?: Community } | undefined)?.community ?? null;
      onSaved(saved);
    },
    [onSaved],
  );

  return (
    <FormComponent
      form={form}
      initialValues={initialValues}
      derive={derive}
      onStatusChange={onStatusChange}
      className="mx-auto grid max-w-4xl grid-cols-12 gap-4"
    >
      <div className="flex justify-end">
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          {form.submitText}
        </Button>
      </div>
    </FormComponent>
  );
}
