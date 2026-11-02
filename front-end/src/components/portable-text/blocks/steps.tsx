import { useId } from "react";
import { ListOrderedIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { perLanguage, t } from "@/i18n";
import { maxChars, minItems, oneLine, required } from "./validation";
import { defineBlock } from "./defineBlock";

const MAX_STEPS = 20;
const MAX_TITLE = 120;

const stepsSchema = z.object({
  title: z
    .string()
    .refine((title) => title.length <= MAX_TITLE, maxChars(MAX_TITLE))
    .refine((title) => !/[\r\n]/.test(title), oneLine)
    .optional(),
  items: z
    .array(
      z.object({
        _key: z.string().min(1, required),
        title: z
          .string()
          .refine((title) => title.trim() !== "", required)
          .refine((title) => title.length <= MAX_TITLE, maxChars(MAX_TITLE))
          .refine((title) => !/[\r\n]/.test(title), oneLine),
        text: z.string().optional(),
      })
    )
    .min(1, minItems(1))
    .max(MAX_STEPS)
    .refine(
      (items) => new Set(items.map((item) => item._key)).size === items.length,
      "step keys must be unique"
    ),
});

type StepsValue = z.infer<typeof stepsSchema>;

const stepsFormFields = perLanguage((): FormField[] => [
  new FormField({
    id: "title",
    name: "title",
    label: t("blocks:steps.fields.title"),
    type: "string",
    interfaceType: "text",
    placeholder: t("blocks:steps.fields.howTo"),
  }),
  new FormField({
    id: "items",
    name: "items",
    label: t("blocks:steps.fields.steps"),
    type: "array",
    interfaceType: "list",
    itemLabel: t("blocks:steps.fields.step"),
    addLabel: t("blocks:steps.fields.addStep"),
    minItems: 1,
    maxItems: MAX_STEPS,
    itemFields: [
      new FormField({
        id: "title",
        name: "title",
        label: t("blocks:steps.fields.title"),
        type: "string",
        interfaceType: "text",
        placeholder: t("blocks:steps.fields.whatToDo"),
        isRequired: true,
      }),
      new FormField({
        id: "text",
        name: "text",
        label: t("blocks:steps.fields.details"),
        type: "string",
        interfaceType: "textarea",
      }),
    ],
  }),
]);

function StepsView({ value }: { value: StepsValue }) {
  const titleId = useId();
  return (
    <div className="rounded-2xl border bg-card p-5 text-card-foreground md:p-6">
      {value.title ? (
        <p id={titleId} dir="auto" className="mb-4 flex items-center gap-2 font-semibold break-words">
          <ListOrderedIcon aria-hidden className="size-5 shrink-0 text-primary" />
          {value.title}
        </p>
      ) : null}
      <ol aria-labelledby={value.title ? titleId : undefined}>
        {value.items.map((item, index) => (
          <li key={item._key} className="relative flex gap-4 pb-5 last:pb-0">
            {index < value.items.length - 1 ? (
              <span aria-hidden className="absolute top-10 bottom-0 start-5 border-s-2 border-border" />
            ) : null}
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
            >
              {index + 1}
            </span>
            <div className="min-w-0 pt-2">
              <p dir="auto" className="font-semibold break-words">
                {item.title}
              </p>
              {item.text ? (
                <p dir="auto" className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {item.text}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const steps = defineBlock<StepsValue>({
  name: "steps",
  get title() {
    return t("blocks:steps.title");
  },
  get description() {
    return t("blocks:steps.description");
  },
  icon: ListOrderedIcon,
  category: "layout",
  get fields() {
    return stepsFormFields();
  },
  defaultValues: {},
  schema: stepsSchema,
  View: StepsView,
  summary: (value) => t("blocks:steps.summary", { count: value.items.length }),
  examples: [
    {
      title: "Lentil soup",
      items: [
        { _key: "a1", title: "Toast the spices", text: "Cumin and coriander, two minutes in a dry pan." },
        { _key: "a2", title: "Add the lentils", text: "One cup, rinsed.\nCover with three cups of water." },
        { _key: "a3", title: "Simmer until soft", text: "About 25 minutes. Salt at the end." },
      ],
    },
    {
      items: [
        { _key: "b1", title: "Create a persona" },
        { _key: "b2", title: "Join a channel" },
        { _key: "b3", title: "Say hello" },
      ],
    },
    { items: [{ _key: "c1", title: "Restart the router", text: "Unplug it for ten seconds." }] },
    {
      items: [
        { _key: "d1", title: "اغسل الأرز", text: "حتى يصبح الماء صافيًا." },
        { _key: "d2", title: "انقعه نصف ساعة" },
      ],
    },
  ],
});
