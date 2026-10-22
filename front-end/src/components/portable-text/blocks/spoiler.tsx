import { useEffect, useId, useRef, useState } from "react";
import { PortableText } from "@portabletext/react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/models/Forms/FormField";
import { cn } from "@/lib/utils";
import displayBlockComponents from "../displayBlocks";
import { defineBlock } from "./defineBlock";

const MAX_BLOCKS = 20;
const MAX_LABEL = 120;

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
    <div
      className="rounded-md border border-border bg-card text-card-foreground"
      onClick={revealed ? undefined : () => toggle(true)}
    >
      {revealed ? (
        <div className="flex min-h-11 items-center gap-2 px-4 py-2">
          <EyeIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span dir="auto" className="min-w-0 font-semibold break-words">
            {label ?? "Spoiler"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded
            aria-controls={contentId}
            className="ms-auto max-md:min-h-11"
            onClick={() => toggle(false)}
          >
            Hide
          </Button>
        </div>
      ) : (
        <button
          ref={showRef}
          type="button"
          aria-expanded={false}
          aria-controls={contentId}
          aria-label={label ? `Show spoiler: ${label}` : "Show spoiler"}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <EyeOffIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span dir="auto" className="min-w-0 font-semibold break-words">
            {label ?? "Spoiler"}
          </span>
          <span className="ms-auto shrink-0 text-sm text-muted-foreground">Tap to reveal</span>
        </button>
      )}
      <div
        id={contentId}
        ref={contentRef}
        tabIndex={-1}
        aria-hidden={!revealed}
        inert={!revealed}
        className={cn(
          "space-y-4 px-4 pb-3 break-words transition-[filter] duration-300 focus:outline-none motion-reduce:transition-none",
          !revealed && "cursor-pointer blur-md select-none"
        )}
      >
        <PortableText value={value.content} components={displayBlockComponents} />
      </div>
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
