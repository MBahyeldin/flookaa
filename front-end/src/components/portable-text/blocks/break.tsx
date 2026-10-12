import { SeparatorHorizontalIcon } from "lucide-react";
import { tv } from "tailwind-variants";
import { z } from "zod";
import { defineBlock, type BlockEditorProps } from "./defineBlock";

const breakSchema = z.object({});

type BreakValue = z.infer<typeof breakSchema>;

const chipStyle = tv({
  base: "my-1 p-1 flex items-center justify-center gap-1 border-2 border-muted rounded",
  variants: {
    selected: {
      true: "border-primary",
    },
    focused: {
      true: "bg-primary/10",
    },
  },
});

function BreakEditor({ selected, focused }: BlockEditorProps<BreakValue>) {
  return (
    <div className={chipStyle({ selected, focused })}>
      <SeparatorHorizontalIcon className="size-4" />
    </div>
  );
}

export const breakBlock = defineBlock<BreakValue>({
  name: "break",
  title: "Break",
  description: "A divider between two parts of a post.",
  icon: SeparatorHorizontalIcon,
  category: "layout",
  fields: [],
  defaultValues: {},
  schema: breakSchema,
  View: () => <hr className="border-border" />,
  Editor: BreakEditor,
  examples: [{}],
});
