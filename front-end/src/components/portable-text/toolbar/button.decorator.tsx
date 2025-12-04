import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDecoratorButton } from "@portabletext/toolbar";
import type { ToolbarDecoratorSchemaType } from "@portabletext/toolbar";

export function DecoratorButton(props: {
  schemaType: ToolbarDecoratorSchemaType;
}) {
  console.log("DecoratorButton props", props);

  const decoratorButton = useDecoratorButton(props);
  console.log("decoratorButton", decoratorButton);
  console.log("decoratorButton snapshot", decoratorButton.snapshot);

  return (
    <Tooltip>
      <TooltipTrigger>
        <Toggle
          className="p-2 rounded hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          value={props.schemaType.value}
          disabled={decoratorButton.snapshot.matches("disabled")}
          onClick={() => decoratorButton.send({ type: "toggle" })}
          aria-label={props.schemaType.title || props.schemaType.value}
          title={
            props.schemaType.title
              ? `${props.schemaType.title} (${
                  props.schemaType.shortcut || "no shortcut"
                })`
              : props.schemaType.value
          }
          pressed={
            decoratorButton.snapshot.matches({ disabled: "active" }) ||
            decoratorButton.snapshot.matches({ enabled: "active" })
          }
        >
          {props.schemaType.icon ? (
            <props.schemaType.icon />
          ) : (
            props.schemaType.title || props.schemaType.value
          )}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>{props.schemaType.title}</TooltipContent>
    </Tooltip>
  );
}
