import { QuoteIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { defineBlock } from "./defineBlock";

const MAX_ATTRIBUTION = 120;

const attribution = z
  .string()
  .max(MAX_ATTRIBUTION)
  .refine((value) => !/[\r\n]/.test(value), "must be one line")
  .optional();

const quoteSchema = z.object({
  text: z.string().refine((text) => text.trim() !== "", "is required"),
  name: attribution,
  role: attribution,
});

type QuoteValue = z.infer<typeof quoteSchema>;

const quoteFormFields: FormField[] = [
  new FormField({
    id: "text",
    name: "text",
    label: "Quote",
    type: "string",
    interfaceType: "textarea",
    placeholder: "What did they say?",
    isRequired: true,
    width: "full",
  }),
  new FormField({
    id: "name",
    name: "name",
    label: "Name",
    type: "string",
    interfaceType: "text",
    placeholder: "Who said it",
    width: "full",
  }),
  new FormField({
    id: "role",
    name: "role",
    label: "Role",
    type: "string",
    interfaceType: "text",
    placeholder: "e.g. Founder, Acme",
    width: "full",
  }),
];

function QuoteView({ value }: { value: QuoteValue }) {
  const hasAttribution = Boolean(value.name || value.role);

  return (
    <figure className="relative rounded-md border bg-card px-5 py-4 text-foreground">
      <QuoteIcon aria-hidden className="absolute top-5 start-3 size-4 text-primary/40" />
      <blockquote dir="auto" className="relative ps-4 text-lg italic whitespace-pre-wrap break-words">
        {value.text}
      </blockquote>
      {hasAttribution ? (
        <figcaption dir="auto" className="mt-2 ps-4 text-sm break-words">
          {value.name ? <span className="font-semibold">{value.name}</span> : null}
          {value.name && value.role ? ", " : null}
          {value.role ? <span className="text-muted-foreground">{value.role}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

export const quote = defineBlock<QuoteValue>({
  name: "quote",
  title: "Quote",
  description: "A highlighted quote, with who said it.",
  icon: QuoteIcon,
  category: "layout",
  fields: quoteFormFields,
  defaultValues: {},
  schema: quoteSchema,
  View: QuoteView,
  examples: [
    {
      text: "We moved our whole community here in a weekend.\nNobody wants to go back.",
      name: "Lina Haddad",
      role: "Organizer, Cairo Makers",
    },
    { text: "Simplicity is the ultimate sophistication.", name: "Leonardo da Vinci" },
    { text: "Write the post you wish you could read." },
    { text: "العلم في الصغر كالنقش على الحجر.", name: "مثل عربي" },
  ],
});
