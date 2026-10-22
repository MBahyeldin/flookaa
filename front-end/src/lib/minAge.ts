import { FormField } from "@/models/Forms/FormField";

export const MIN_AGES = [13, 16, 18, 21] as const;

/** Every community and channel is at least this; only higher limits are worth a badge. */
export const BASE_MIN_AGE = MIN_AGES[0];

export const MIN_AGE_ERROR = "You can't set an age limit above your own age.";

export function minAgeField(width: "1/2" | "full" = "1/2") {
  return new FormField({
    id: "min_age",
    label: "Minimum age",
    type: "select",
    placeholder: "Who can see it?",
    interfaceType: "select",
    options: MIN_AGES.map((a) => ({ label: `${a}+`, value: String(a) })),
    isRequired: true,
    width,
    hint: (value) => (value ? `Users under ${value} won't see it at all.` : null),
    validate: (value) => (value ? null : "Pick a minimum age."),
    serialize: (value) => Number(value),
  });
}
