 
import { Button } from "@/components/ui/button";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useEditor,
  useEditorSelector,
  type RangeDecoration,
  type RangeDecorationOnMovedDetails,
} from "@portabletext/editor";
import { TextCursorIcon } from "lucide-react";
import { useCallback } from "react";

export function RangeDecorationButton(props: {
  onAddRangeDecoration: (rangeDecoration: RangeDecoration) => void;
  onRangeDecorationMoved: (details: RangeDecorationOnMovedDetails) => void;
}) {
  const editor = useEditor();
  const disabled = useEditorSelector(
    editor,
    (snapshot: { context: { readOnly: boolean; selection: any } }) =>
      snapshot.context.readOnly || !snapshot.context.selection
  );
  const onPress = useCallback(() => {
    props.onAddRangeDecoration({
      component: RangeComponent,
      selection: editor.getSnapshot().context.selection,
      onMoved: props.onRangeDecorationMoved,
    });
    editor.send({
      type: "focus",
    });
  }, [editor, props]);

  return (
    // TooltipContent is a sibling of the trigger, not a child of it. The
    // enclosing <Tooltip> is provided by the caller.
    <>
      <TooltipTrigger asChild>
        <Button
          aria-label="Decorate"
          disabled={disabled}
          variant="secondary"
          size="sm"
          onClick={onPress}
        >
          <TextCursorIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Add Range Decoration</TooltipContent>
    </>
  );
}

function RangeComponent(props: React.PropsWithChildren<unknown>) {
  return (
    <span className="bg-success/10 border border-success px-1">
      {props.children}
    </span>
  );
}
