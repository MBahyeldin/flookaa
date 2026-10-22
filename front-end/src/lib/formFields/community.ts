import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";
import { MAX_COMMUNITY_INTERESTS, MAX_COMMUNITY_RULES } from "@/types/community";
import { SLUG_PATTERN } from "@/lib/slug";
import { minAgeField } from "@/lib/minAge";

const communityFields = [
  new FormField({
    id: "name",
    label: "Community name",
    type: "text",
    placeholder: "Web Development",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
    validate: (value) => (typeof value === "string" && value.trim().length > 100 ? "Use at most 100 characters." : null),
  }),
  new FormField({
    id: "slug",
    label: "Link",
    type: "text",
    placeholder: "web-development",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
    hint: (value) => (value ? `/communities/${value}` : null),
    validate: (value) =>
      typeof value === "string" && value !== "" && !SLUG_PATTERN.test(value)
        ? "Use 3–50 lowercase letters, digits or single hyphens."
        : null,
  }),
  new FormField({
    id: "description",
    label: "Description",
    type: "textarea",
    placeholder: "What is this community about?",
    interfaceType: "text",
    width: "full",
  }),
  new FormField({
    id: "rules",
    label: "Rules",
    type: "textarea",
    placeholder: "Shown on the community page and to everyone before they join.",
    interfaceType: "text",
    width: "full",
    hint: (value) => `${typeof value === "string" ? value.trim().length : 0} / ${MAX_COMMUNITY_RULES}`,
    validate: (value) =>
      typeof value === "string" && value.trim().length > MAX_COMMUNITY_RULES
        ? `Use at most ${MAX_COMMUNITY_RULES} characters.`
        : null,
  }),
  new FormField({
    id: "visibility",
    label: "Visibility",
    type: "select",
    placeholder: "Who can join?",
    interfaceType: "select",
    options: [
      { label: "Public", value: "public" },
      { label: "Private", value: "private" },
    ],
    isRequired: true,
    width: "1/2",
  }),
  minAgeField(),
  new FormField({
    id: "thumbnail",
    label: "Thumbnail",
    type: "text",
    interfaceType: "pic",
    width: "1/2",
    height: "h-32",
  }),
  new FormField({
    id: "banner",
    label: "Banner",
    type: "text",
    interfaceType: "pic",
    width: "full",
    height: "h-32",
  }),
  new FormField({
    id: "interest_ids",
    label: "Interests",
    type: "text",
    interfaceType: "interests",
    isRequired: true,
    width: "full",
    maxItems: MAX_COMMUNITY_INTERESTS,
    validate: (value) => {
      const n = Array.isArray(value) ? value.length : 0;
      return n < 1 || n > MAX_COMMUNITY_INTERESTS ? `Pick 1 to ${MAX_COMMUNITY_INTERESTS} interests.` : null;
    },
  }),
];

/** Visibility is only offered to the owner and global Administrators. */
export default function communityFormFieldsGroups(canOwn: boolean): FormGroup[] {
  return [
    {
      id: "community_group_1",
      label: "Community",
      description: "",
      fields: canOwn ? communityFields : communityFields.filter((f) => f.id !== "visibility"),
      sort: 1,
    },
  ];
}
