import { useEffect, useId, useRef, useState } from "react";
import { PortableText } from "@portabletext/react";
import { EyeIcon, EyeOffIcon, SparklesIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import displayBlockComponents from "../displayBlocks";
import { defineBlock } from "./defineBlock";

const MAX_BLOCKS = 20;
const MAX_LABEL = 120;

const stripes = {
  backgroundImage:
    "repeating-linear-gradient(135deg, transparent 0 28px, color-mix(in srgb, var(--primary) 8%, transparent) 28px 56px)",
};

// v1 content is plain paragraphs only, mirroring plainParagraph in spoiler.go.
const paragraphSchema = z
  .object({
    _type: z.literal("block"),
    _key: z.string().min(1, "is required"),
    style: z.literal("normal"),
    listItem: z.unknown().optional(),
    level: z.unknown().optional(),
    markDefs: z.array(z.unknown()).optional(),
    children: z.array(
      z.object({
        _type: z.literal("span"),
        _key: z.string(),
        text: z.string(),
        marks: z.array(z.string()).optional(),
      })
    ),
  })
  .refine(
    (block) =>
      block.listItem == null &&
      block.level == null &&
      !block.markDefs?.length &&
      block.children.every((span) => !span.marks?.length),
    "must be plain text"
  );

const spoilerSchema = z.object({
  label: z
    .string()
    .refine((label) => label.length <= MAX_LABEL, `must be at most ${MAX_LABEL} characters`)
    .refine((label) => !/[\r\n]/.test(label), "must be one line")
    .optional(),
  content: z
    .array(paragraphSchema)
    .min(1, "is required")
    .max(MAX_BLOCKS)
    .refine(
      (content) => new Set(content.map((block) => block._key)).size === content.length,
      "content keys must be unique"
    )
    .refine(
      (content) => content.some((block) => block.children.some((span) => span.text.trim() !== "")),
      "is required"
    ),
});

type SpoilerValue = z.infer<typeof spoilerSchema>;

function paragraphs(text: string): SpoilerValue["content"] {
  return text
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.replace(/^\n+|\n+$/g, ""))
    .filter((paragraph) => paragraph.trim() !== "")
    .map((paragraph, index) => ({
      _type: "block" as const,
      _key: `p${index + 1}`,
      style: "normal" as const,
      markDefs: [],
      children: [{ _type: "span" as const, _key: `p${index + 1}s`, text: paragraph, marks: [] }],
    }));
}

const spoilerFormFields: FormField[] = [
  new FormField({
    id: "label",
    name: "label",
    label: "Label",
    type: "string",
    interfaceType: "text",
    placeholder: "What's hidden? e.g. Finale spoilers",
  }),
  new FormField({
    id: "content",
    name: "content",
    label: "Content",
    type: "string",
    interfaceType: "textarea",
    placeholder: "The hidden part",
    isRequired: true,
  }),
];

function SpoilerView({ value }: { value: SpoilerValue }) {
  const [revealed, setRevealed] = useState(false);
  const toggled = useRef(false);
  const showRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const label = value.label?.trim() ? value.label : undefined;

  useEffect(() => {
    if (!toggled.current) return;
    (revealed ? contentRef.current : showRef.current)?.focus();
  }, [revealed]);

  const toggle = (next: boolean) => {
    toggled.current = true;
    setRevealed(next);
  };

  return (
    <div>
      {revealed ? (
        <div className="rounded-2xl bg-secondary px-5 py-4 text-secondary-foreground">
          <button
            type="button"
            aria-expanded
            aria-controls={contentId}
            aria-label={label ? `Hide spoiler: ${label}` : "Hide spoiler"}
            className="-mx-1 flex min-h-8 max-w-full items-center gap-2 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11"
            onClick={() => toggle(false)}
          >
            <EyeIcon aria-hidden className="size-4 shrink-0" />
            <span dir="auto" className="min-w-0 truncate font-medium">
              {label ?? "Spoiler"}
            </span>
          </button>
          <div
            id={contentId}
            ref={contentRef}
            tabIndex={-1}
            className="mt-2 space-y-4 break-words focus:outline-none"
          >
            <PortableText value={value.content} components={displayBlockComponents} />
          </div>
        </div>
      ) : (
        <button
          ref={showRef}
          type="button"
          aria-expanded={false}
          aria-controls={contentId}
          aria-label={label ? `Show spoiler: ${label}` : "Show spoiler"}
          onClick={() => toggle(true)}
          style={stripes}
          className="flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-6 text-center text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-card text-primary">
            <EyeOffIcon className="size-5" />
          </span>
          <span dir="auto" className="max-w-full font-semibold break-words">
            {label ?? "Spoiler"}
          </span>
          <span
            aria-hidden
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
          >
            <SparklesIcon className="size-3.5" />
            Tap to reveal
          </span>
        </button>
      )}
    </div>
  );
}

export const spoiler = defineBlock<SpoilerValue>({
  name: "spoiler",
  title: "Spoiler",
  description: "Content hidden until the reader taps it.",
  icon: EyeOffIcon,
  category: "layout",
  fields: spoilerFormFields,
  defaultValues: {},
  schema: spoilerSchema,
  View: SpoilerView,
  toForm: (value) => ({
    ...value,
    content: (value.content ?? [])
      .map((block) => block.children.map((span) => span.text).join(""))
      .join("\n\n"),
  }),
  fromForm: (form) => ({
    ...form,
    content: paragraphs(typeof form.content === "string" ? form.content : ""),
  }),
  examples: [
    { label: "Finale spoilers", content: paragraphs("The lighthouse keeper was the narrator all along.") },
    { content: paragraphs("The answer is 42.") },
    {
      label: "Ending",
      content: paragraphs("They make it home.\nBut not all of them.\n\nThe last scene is ten years later."),
    },
    { label: "حرق للأحداث", content: paragraphs("البطل يعود إلى قريته في النهاية.") },
  ],
});
