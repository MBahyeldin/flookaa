import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useListButton } from "@portabletext/toolbar";
import type { ToolbarListSchemaType } from "@portabletext/toolbar";
export function ListButton(props: { schemaType: ToolbarListSchemaType }) {
  const listButton = useListButton(props);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          aria-label={props.schemaType.title ?? props.schemaType.name}
          size="sm"
          disabled={listButton.snapshot.matches("disabled")}
          onClick={() => {
            listButton.send({ type: "toggle" });
          }}
        >
         { props.schemaType.icon ? <props.schemaType.icon /> : null }
        </Toggle>
      </TooltipTrigger>
      {/* TooltipContent is a sibling of the trigger, not a child of it. */}
      <TooltipContent>{props.schemaType.title}</TooltipContent>
    </Tooltip>
  );
}
