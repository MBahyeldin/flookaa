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
  const decoratorButton = useDecoratorButton(props);

  // `shortcut` isn't always a string; interpolating it directly produced
  // title="Strong ([object Object])".
  const shortcut =
    typeof props.schemaType.shortcut === "string"
      ? props.schemaType.shortcut
      : undefined;

  return (
    <Tooltip>
      {/* asChild: without it the trigger renders its own <button> around the
          Toggle's <button>, which is invalid HTML and breaks tab order. */}
      <TooltipTrigger asChild>
        <Toggle
          className="p-2 rounded hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          value={props.schemaType.value}
          disabled={decoratorButton.snapshot.matches("disabled")}
          onClick={() => decoratorButton.send({ type: "toggle" })}
          aria-label={props.schemaType.title || props.schemaType.value}
          title={
            props.schemaType.title
              ? shortcut
                ? `${props.schemaType.title} (${shortcut})`
                : props.schemaType.title
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
