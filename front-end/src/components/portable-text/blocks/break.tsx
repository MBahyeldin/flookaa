import { SailboatIcon, SeparatorHorizontalIcon } from "lucide-react";
import { tv } from "tailwind-variants";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { defineBlock, type BlockEditorProps } from "./defineBlock";

const styles = ["line", "dashed", "dots", "ornament"] as const;

const breakSchema = z.object({
  style: z.enum(styles).optional(),
});

type BreakValue = z.infer<typeof breakSchema>;

const label = (value: string) => value[0].toUpperCase() + value.slice(1);

const breakFormFields: FormField[] = [
  new FormField({
    id: "style",
    name: "style",
    label: "Style",
    type: "string",
    interfaceType: "select",
    options: styles.map((style) => ({ label: label(style), value: style })),
    width: "full",
  }),
];

const chipStyle = tv({
  base: "my-1 px-2 py-1 border-2 border-muted rounded",
  variants: {
    selected: {
      true: "border-primary",
    },
    focused: {
      true: "bg-primary/10",
    },
  },
});

function BreakMark({ style }: { style: NonNullable<BreakValue["style"]> }) {
  switch (style) {
    case "dashed":
      return <span className="w-full border-t-2 border-dashed border-border" />;
    case "dots":
      return (
        <span className="flex items-center gap-4">
          <span className="size-2 rounded-full bg-primary/40" />
          <span className="size-2 rounded-full bg-primary/60" />
          <span className="size-2 rounded-full bg-primary" />
          <span className="size-2 rounded-full bg-primary/60" />
          <span className="size-2 rounded-full bg-primary/40" />
        </span>
      );
    case "ornament":
      return (
        <>
          <span className="h-px flex-1 bg-border" />
          <SailboatIcon className="size-5 shrink-0 text-primary" />
          <span className="h-px flex-1 bg-border" />
        </>
      );
    default:
      return <span className="w-full border-t border-border" />;
  }
}

function BreakView({ value }: { value: BreakValue }) {
  return (
    <div role="separator" className="flex h-6 items-center justify-center gap-4">
      <BreakMark style={value.style ?? "line"} />
    </div>
  );
}

function BreakEditor({ value, selected, focused }: BlockEditorProps<BreakValue>) {
  return (
    <div className={chipStyle({ selected, focused })}>
      <BreakView value={value} />
    </div>
  );
}

export const breakBlock = defineBlock<BreakValue>({
  name: "break",
  title: "Divider",
  description: "A line, dots or a sailboat between two parts of a post.",
  icon: SeparatorHorizontalIcon,
  category: "layout",
  fields: breakFormFields,
  defaultValues: { style: "line" },
  schema: breakSchema,
  View: BreakView,
  Editor: BreakEditor,
  examples: [{}, { style: "line" }, { style: "dashed" }, { style: "dots" }, { style: "ornament" }],
});
