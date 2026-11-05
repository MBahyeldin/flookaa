import { QuoteIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { perLanguage, t } from "@/i18n";
import { oneLine, required } from "./validation";
import { defineBlock } from "./defineBlock";

const MAX_ATTRIBUTION = 120;

const attribution = z
  .string()
  .max(MAX_ATTRIBUTION)
  .refine((value) => !/[\r\n]/.test(value), oneLine)
  .optional();

const quoteSchema = z.object({
  text: z.string().refine((text) => text.trim() !== "", required),
  name: attribution,
  role: attribution,
});

type QuoteValue = z.infer<typeof quoteSchema>;

const quoteFormFields = perLanguage((): FormField[] => [
  new FormField({
    id: "text",
    name: "text",
    label: t("blocks:quote.fields.quote"),
    type: "string",
    interfaceType: "textarea",
    placeholder: t("blocks:quote.fields.whatDidTheySay"),
    isRequired: true,
    width: "full",
  }),
  new FormField({
    id: "name",
    name: "name",
    label: t("blocks:quote.fields.name"),
    type: "string",
    interfaceType: "text",
    placeholder: t("blocks:quote.fields.whoSaidIt"),
    width: "full",
  }),
  new FormField({
    id: "role",
    name: "role",
    label: t("blocks:quote.fields.role"),
    type: "string",
    interfaceType: "text",
    placeholder: t("blocks:quote.fields.eGFounderAcme"),
    width: "full",
  }),
]);

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toUpperCase();
}

function QuoteView({ value }: { value: QuoteValue }) {
  const hasAttribution = Boolean(value.name || value.role);

  return (
    <figure className="relative overflow-hidden rounded-2xl bg-accent p-6 text-accent-foreground md:p-8">
      <span aria-hidden className="absolute -top-16 -end-16 size-48 rounded-full bg-primary/10" />
      <span aria-hidden className="relative block h-10 text-7xl font-bold leading-none text-primary rtl:-scale-x-100">
        &ldquo;
      </span>
      <blockquote dir="auto" className="relative mt-4 text-lead font-medium whitespace-pre-wrap break-words">
        {value.text}
      </blockquote>
      {hasAttribution ? (
        <figcaption className="relative mt-5 flex items-center gap-3">
          {value.name ? (
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-xs font-semibold text-primary"
            >
              {initials(value.name)}
            </span>
          ) : null}
          <span dir="auto" className="min-w-0 text-sm break-words">
            {value.name ? <span className="block font-semibold">{value.name}</span> : null}
            {value.role ? <span className="block text-muted-foreground">{value.role}</span> : null}
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}

export const quote = defineBlock<QuoteValue>({
  name: "quote",
  get title() {
    return t("blocks:quote.title");
  },
  get description() {
    return t("blocks:quote.description");
  },
  icon: QuoteIcon,
  category: "layout",
  get fields() {
    return quoteFormFields();
  },
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
