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
          disabled={styleSelector.snapshot.matches("disabled")}
        >
          <SelectValue placeholder="Styles" />
        </SelectTrigger>
        <SelectContent>
          {props.schemaTypes.map((style) => (
            <SelectItem key={style.name} value={style.value}>
              {style.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
