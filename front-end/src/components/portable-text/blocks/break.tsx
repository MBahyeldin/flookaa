import { SeparatorHorizontalIcon, SparkleIcon } from "lucide-react";
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
      return <span className="w-full border-t border-dashed border-border" />;
    case "dots":
      return (
        <span className="flex gap-3 leading-none text-muted-foreground">
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </span>
      );
    case "ornament":
      return (
        <>
          <span className="h-px w-16 bg-border" />
          <SparkleIcon className="size-4 text-primary" />
          <span className="h-px w-16 bg-border" />
        </>
      );
    default:
      return <span className="w-full border-t border-border" />;
  }
}

function BreakView({ value }: { value: BreakValue }) {
  return (
    <div role="separator" className="flex h-4 items-center justify-center gap-3">
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
  description: "A line, dots or an ornament between two parts of a post.",
  icon: SeparatorHorizontalIcon,
  category: "layout",
  fields: breakFormFields,
  defaultValues: { style: "line" },
  schema: breakSchema,
  View: BreakView,
  Editor: BreakEditor,
  examples: [{}, { style: "line" }, { style: "dashed" }, { style: "dots" }, { style: "ornament" }],
});
