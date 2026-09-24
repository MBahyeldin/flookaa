import type { ToolbarStyleSchemaType } from "@portabletext/toolbar";
import { useStyleSelector } from "@portabletext/toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SelectValue } from "@radix-ui/react-select";

export function StyleButton(props: {
  schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>;
}) {
  const styleSelector = useStyleSelector(props);

  return (
    <>
      <Select
        value={styleSelector.snapshot.context.activeStyle}
        onValueChange={(value) =>
          styleSelector.send({ type: "toggle", style: value })
        }
      >
        <SelectTrigger
          className="w-full"
          /* Named explicitly: this control is block-scoped (it restyles the
             whole paragraph), unlike the span-scoped decorators beside it. */
          aria-label="Paragraph style"
          title="Paragraph style — applies to the whole line"
          disabled={styleSelector.snapshot.matches("disabled")}
        >
          <SelectValue placeholder="Paragraph" />
        </SelectTrigger>
        <SelectContent>
          {props.schemaTypes.map((style) => (
            <SelectItem key={style.name} value={style.value}>
              {/* The schema defines proper titles ("Normal", "Heading 1", …);
                  this was rendering the raw lowercase `name` instead. */}
              {style.title ?? style.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
