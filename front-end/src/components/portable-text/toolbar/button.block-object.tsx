import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { useBlockObjectButton } from "@portabletext/toolbar";
import type { ToolbarBlockObjectSchemaType } from "@portabletext/toolbar";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { InsertBlockObjectForm } from "./form.insert-block-object";
export function BlockObjectButton(props: {
  schemaType: ToolbarBlockObjectSchemaType;
}) {
  console.log("props", props);

  const { snapshot, send } = useBlockObjectButton(props);

  return (
    <Dialog
      open={snapshot.matches({ enabled: "showing dialog" })}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          send({ type: "open dialog" });
        } else {
          send({ type: "close dialog" });
        }
      }}
    >
      <DialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              isSelected={false}
              isDisabled={snapshot.matches("disabled")}
              onClick={() => {
                send({ type: "open dialog" });
              }}
              aria-label={props.schemaType.title ?? props.schemaType.name}
            >
              {props.schemaType.icon ? (
                <props.schemaType.icon className="h-4 w-4" />
              ) : (
                <span className="h-4 w-4" />
              )}
            </Toggle>
          </TooltipTrigger>

          <TooltipContent>Insert {props.schemaType.title}</TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>
          {props.schemaType.title ?? props.schemaType.name}
        </DialogTitle>
        <InsertBlockObjectForm
          fields={props.schemaType.fields}
          defaultValues={props.schemaType.defaultValues}
          onSubmit={({ value, placement }) => {
            send({
              type: "insert",
              value: { ...value },
              placement,
            });
            send({ type: "close dialog" });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
