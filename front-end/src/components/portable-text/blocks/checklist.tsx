import { useId } from "react";
import { CheckIcon, ListChecksIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { cn } from "@/lib/utils";
import { defineBlock } from "./defineBlock";

const MAX_ITEMS = 50;
const MAX_TEXT = 120;

const checklistSchema = z.object({
  title: z
    .string()
    .refine((title) => title.length <= MAX_TEXT, `must be at most ${MAX_TEXT} characters`)
    .refine((title) => !/[\r\n]/.test(title), "must be one line")
    .optional(),
  items: z
    .array(
      z.object({
        _key: z.string().min(1, "is required"),
        text: z
          .string()
          .refine((text) => text.trim() !== "", "is required")
          .refine((text) => text.length <= MAX_TEXT, `must be at most ${MAX_TEXT} characters`)
          .refine((text) => !/[\r\n]/.test(text), "must be one line"),
        checked: z.boolean(),
      })
    )
    .min(1, "at least one item is required")
    .max(MAX_ITEMS)
    .refine(
      (items) => new Set(items.map((item) => item._key)).size === items.length,
      "item keys must be unique"
    ),
});

type ChecklistValue = z.infer<typeof checklistSchema>;

const checklistFormFields: FormField[] = [
  new FormField({
    id: "title",
    name: "title",
    label: "Title",
    type: "string",
    interfaceType: "text",
    placeholder: "Packing list",
  }),
  new FormField({
    id: "items",
    name: "items",
    label: "Items",
    type: "array",
    interfaceType: "list",
    itemLabel: "Item",
    addLabel: "Add item",
    minItems: 1,
    maxItems: MAX_ITEMS,
    itemFields: [
      new FormField({
        id: "text",
        name: "text",
        label: "Text",
        type: "string",
        interfaceType: "text",
        placeholder: "Something to do",
        isRequired: true,
      }),
      new FormField({
        id: "checked",
        name: "checked",
        label: "Done",
        type: "boolean",
        interfaceType: "switch",
      }),
    ],
  }),
];

function ChecklistView({ value }: { value: ChecklistValue }) {
  const titleId = useId();
  const done = value.items.filter((item) => item.checked).length;
  return (
    <div>
      {value.title ? (
        <p id={titleId} dir="auto" className="text-lg font-semibold break-words text-foreground">
          {value.title}
        </p>
      ) : null}
      <p className="mb-2 text-sm text-muted-foreground">
        {done} of {value.items.length} done
      </p>
      <ul className="space-y-2 text-foreground" aria-labelledby={value.title ? titleId : undefined}>
        {value.items.map((item) => (
          <li key={item._key} className="flex items-start gap-3">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded",
                item.checked ? "bg-primary text-primary-foreground" : "border border-border"
              )}
            >
              {item.checked ? <CheckIcon className="size-3.5" strokeWidth={3} /> : null}
            </span>
            <span
              dir="auto"
              className={cn("min-w-0 break-words", item.checked && "text-muted-foreground line-through")}
            >
              <span className="sr-only">{item.checked ? "Done: " : "Not done: "}</span>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const checklist = defineBlock<ChecklistValue>({
  name: "checklist",
  title: "Checklist",
  description: "A list of items you tick off.",
  icon: ListChecksIcon,
  category: "layout",
  fields: checklistFormFields,
  defaultValues: {},
  schema: checklistSchema,
  View: ChecklistView,
  fromForm: (form) => ({
    ...form,
    items: (Array.isArray(form.items) ? form.items : []).map((item) => ({
      ...item,
      checked: item.checked === true,
    })),
  }) as ChecklistValue,
  examples: [
    {
      title: "Weekend hike",
      items: [
        { _key: "a1", text: "Water, two litres", checked: true },
        { _key: "a2", text: "Trail map", checked: true },
        { _key: "a3", text: "Sunscreen", checked: false },
        { _key: "a4", text: "Charge the headlamp", checked: false },
      ],
    },
    {
      title: "Release checklist",
      items: [
        { _key: "b1", text: "Merge the release branch", checked: true },
        { _key: "b2", text: "Tag main", checked: true },
        { _key: "b3", text: "Deploy the backend first", checked: true },
      ],
    },
    {
      items: [
        { _key: "c1", text: "Read the channel rules", checked: false },
        { _key: "c2", text: "Introduce yourself", checked: false },
      ],
    },
    {
      title: "قائمة التسوق",
      items: [
        { _key: "d1", text: "خبز", checked: true },
        { _key: "d2", text: "حليب", checked: false },
        { _key: "d3", text: "تمر", checked: false },
      ],
    },
  ],
});
