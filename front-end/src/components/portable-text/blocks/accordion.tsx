import { useRef, type SyntheticEvent } from "react";
import { ChevronDownIcon, ChevronsUpDownIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { defineBlock } from "./defineBlock";

const MAX_SECTIONS = 20;
const MAX_TITLE = 120;

const accordionSchema = z.object({
  items: z
    .array(
      z.object({
        _key: z.string().min(1, "is required"),
        title: z
          .string()
          .refine((title) => title.trim() !== "", "is required")
          .refine((title) => title.length <= MAX_TITLE, `must be at most ${MAX_TITLE} characters`)
          .refine((title) => !/[\r\n]/.test(title), "must be one line"),
        text: z.string().refine((text) => text.trim() !== "", "is required"),
      })
    )
    .min(1, "at least one section is required")
    .max(MAX_SECTIONS)
    .refine(
      (items) => new Set(items.map((item) => item._key)).size === items.length,
      "section keys must be unique"
    ),
  allowMultiple: z.boolean().optional(),
  defaultFirstOpen: z.boolean().optional(),
});

type AccordionValue = z.infer<typeof accordionSchema>;

const accordionFormFields: FormField[] = [
  new FormField({
    id: "items",
    name: "items",
    label: "Sections",
    type: "array",
    interfaceType: "list",
    itemLabel: "Section",
    addLabel: "Add section",
    minItems: 1,
    maxItems: MAX_SECTIONS,
    itemFields: [
      new FormField({
        id: "title",
        name: "title",
        label: "Title",
        type: "string",
        interfaceType: "text",
        placeholder: "Question or heading",
        isRequired: true,
      }),
      new FormField({
        id: "text",
        name: "text",
        label: "Content",
        type: "string",
        interfaceType: "textarea",
        isRequired: true,
      }),
    ],
  }),
  new FormField({
    id: "allowMultiple",
    name: "allowMultiple",
    label: "Allow several open",
    type: "boolean",
    interfaceType: "switch",
  }),
  new FormField({
    id: "defaultFirstOpen",
    name: "defaultFirstOpen",
    label: "Open the first section",
    type: "boolean",
    interfaceType: "switch",
  }),
];

function AccordionView({ value }: { value: AccordionValue }) {
  const listRef = useRef<HTMLDivElement>(null);
  const allowMultiple = value.allowMultiple ?? true;

  const onToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const opened = event.currentTarget;
    if (allowMultiple || !opened.open) return;
    listRef.current?.querySelectorAll<HTMLDetailsElement>(":scope > details").forEach((details) => {
      if (details !== opened) details.open = false;
    });
  };

  return (
    <div
      ref={listRef}
      className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card text-card-foreground"
    >
      {value.items.map((item, index) => (
        <details
          key={item._key}
          className="group"
          open={index === 0 && value.defaultFirstOpen === true}
          onToggle={onToggle}
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
            <span dir="auto" className="min-w-0 font-semibold break-words">
              {item.title}
            </span>
            <ChevronDownIcon
              aria-hidden
              className="ms-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <p dir="auto" className="px-4 pb-3 text-muted-foreground whitespace-pre-wrap break-words">
            {item.text}
          </p>
        </details>
      ))}
    </div>
  );
}

export const accordion = defineBlock<AccordionValue>({
  name: "accordion",
  title: "Accordion",
  description: "Sections that open on tap.",
  icon: ChevronsUpDownIcon,
  category: "layout",
  fields: accordionFormFields,
  defaultValues: { allowMultiple: true, defaultFirstOpen: false },
  schema: accordionSchema,
  View: AccordionView,
  examples: [
    {
      items: [
        { _key: "a1", title: "Who can see my posts?", text: "Members of the channel you post in." },
        { _key: "a2", title: "Can I post as another persona?", text: "Switch persona from the menu, then post." },
        { _key: "a3", title: "How do I leave a channel?", text: "Open the channel, then choose Leave." },
      ],
    },
    {
      allowMultiple: false,
      defaultFirstOpen: true,
      items: [
        { _key: "b1", title: "Shipping", text: "Three to five working days." },
        { _key: "b2", title: "Returns", text: "Within 14 days, unused." },
        { _key: "b3", title: "Warranty", text: "One year on all parts." },
      ],
    },
    {
      items: [
        {
          _key: "c1",
          title: "House rules",
          text: "Be kind.\nStay on topic.\nNo spam or self-promotion.",
        },
      ],
    },
    {
      items: [
        { _key: "d1", title: "ما هي مواعيد العمل؟", text: "من الأحد إلى الخميس، من ٩ صباحًا حتى ٥ مساءً." },
        { _key: "d2", title: "كيف أتواصل معكم؟", text: "عبر الرسائل في القناة." },
      ],
    },
  ],
});
