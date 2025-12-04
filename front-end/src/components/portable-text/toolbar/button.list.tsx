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
      <TooltipTrigger>
        <Toggle
          aria-label={props.schemaType.title ?? props.schemaType.name}
          size="sm"
          isDisabled={listButton.snapshot.matches("disabled")}
          isSelected={listButton.snapshot.matches({ enabled: "active" })}
          onClick={() => {
            listButton.send({ type: "toggle" });
          }}
        >
          <props.schemaType.icon />
        </Toggle>
        <TooltipContent>{props.schemaType.title}</TooltipContent>
      </TooltipTrigger>
    </Tooltip>
  );
}
