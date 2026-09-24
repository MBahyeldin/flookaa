import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import type { ToolbarAnnotationSchemaType } from "@portabletext/toolbar";
import { useAnnotationButton } from "@portabletext/toolbar";
import { ObjectForm } from "./object-form";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AnnotationButton(props: {
  schemaType: ToolbarAnnotationSchemaType;
}) {
  const annotationButton = useAnnotationButton(props);
  if (
    annotationButton.snapshot.matches({ disabled: "active" }) ||
    annotationButton.snapshot.matches({ enabled: "active" })
  ) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            aria-label={`Remove ${props.schemaType.title ?? props.schemaType.name}`}
            disabled={annotationButton.snapshot.matches("disabled")}
            onClick={() => {
              annotationButton.send({ type: "remove" });
            }}
          >
            { props.schemaType.icon ? <props.schemaType.icon /> : null}
          </Toggle>
        </TooltipTrigger>
        {/* TooltipContent is a sibling of the trigger, not a child of it. */}
        <TooltipContent side="top">
          Remove {props.schemaType.title ?? props.schemaType.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <Dialog
        open={annotationButton.snapshot.matches({
          enabled: { inactive: "showing dialog" },
        })}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            annotationButton.send({ type: "close dialog" });
          }
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              aria-label={`Add ${props.schemaType.title ?? props.schemaType.name}`}
              disabled={annotationButton.snapshot.matches("disabled")}
              onClick={() => {
                annotationButton.send({ type: "open dialog" });
              }}
            >
            { props.schemaType.icon ? <props.schemaType.icon /> : null}
            </Toggle>
          </TooltipTrigger>

          <TooltipContent>
            Add {props.schemaType.title ?? props.schemaType.name}
          </TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle>
            {props.schemaType.title ?? props.schemaType.name}
          </DialogTitle>
          <ObjectForm
            fields={props.schemaType.fields}
            defaultValues={props.schemaType.defaultValues}
            submitLabel="Add Annotation"
            onSubmit={({ value }) => {
              annotationButton.send({
                type: "add",
                annotation: { value },
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
