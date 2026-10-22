import { useId } from "react";
import { ListOrderedIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { defineBlock } from "./defineBlock";

const MAX_STEPS = 20;
const MAX_TITLE = 120;

const stepsSchema = z.object({
  title: z
    .string()
    .refine((title) => title.length <= MAX_TITLE, `must be at most ${MAX_TITLE} characters`)
    .refine((title) => !/[\r\n]/.test(title), "must be one line")
    .optional(),
  items: z
    .array(
      z.object({
        _key: z.string().min(1, "is required"),
        title: z
          .string()
          .refine((title) => title.trim() !== "", "is required")
          .refine((title) => title.length <= MAX_TITLE, `must be at most ${MAX_TITLE} characters`)
          .refine((title) => !/[\r\n]/.test(title), "must be one line"),
        text: z.string().optional(),
      })
    )
    .min(1, "at least one step is required")
    .max(MAX_STEPS)
    .refine(
      (items) => new Set(items.map((item) => item._key)).size === items.length,
      "step keys must be unique"
    ),
});

type StepsValue = z.infer<typeof stepsSchema>;

const stepsFormFields: FormField[] = [
  new FormField({
    id: "title",
    name: "title",
    label: "Title",
    type: "string",
    interfaceType: "text",
    placeholder: "How to …",
  }),
  new FormField({
    id: "items",
    name: "items",
    label: "Steps",
    type: "array",
    interfaceType: "list",
    itemLabel: "Step",
    addLabel: "Add step",
    minItems: 1,
    maxItems: MAX_STEPS,
    itemFields: [
      new FormField({
        id: "title",
        name: "title",
        label: "Title",
        type: "string",
        interfaceType: "text",
        placeholder: "What to do",
        isRequired: true,
      }),
      new FormField({
        id: "text",
        name: "text",
        label: "Details",
        type: "string",
        interfaceType: "textarea",
      }),
    ],
  }),
];

function StepsView({ value }: { value: StepsValue }) {
  const titleId = useId();
  return (
    <div>
      {value.title ? (
        <p id={titleId} dir="auto" className="mb-2 text-lg font-semibold break-words text-foreground">
          {value.title}
        </p>
      ) : null}
      <ol className="text-foreground" aria-labelledby={value.title ? titleId : undefined}>
        {value.items.map((item, index) => (
          <li key={item._key} className="relative flex gap-3 pb-4 last:pb-0">
            {index < value.items.length - 1 ? (
              <span aria-hidden className="absolute top-8 bottom-1 start-3.5 border-s border-border" />
            ) : null}
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p dir="auto" className="font-semibold break-words">
                {item.title}
              </p>
              {item.text ? (
                <p dir="auto" className="mt-1 text-muted-foreground whitespace-pre-wrap break-words">
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
  title: "Steps",
  description: "A numbered how-to, one step at a time.",
  icon: ListOrderedIcon,
  category: "layout",
  fields: stepsFormFields,
  defaultValues: {},
  schema: stepsSchema,
  View: StepsView,
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
