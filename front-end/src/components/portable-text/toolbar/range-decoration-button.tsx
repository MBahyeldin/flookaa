/* eslint-disable @typescript-eslint/no-explicit-any */
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
    <TooltipTrigger>
      <Button
        aria-label="Decorate"
        isDisabled={disabled}
        variant="secondary"
        size="sm"
        onPress={onPress}
      >
        <TextCursorIcon className="size-4" />
      </Button>
      <TooltipContent>Add Range Decoration</TooltipContent>
    </TooltipTrigger>
  );
}

function RangeComponent(props: React.PropsWithChildren<unknown>) {
  return (
    <span className="bg-green-200 border border-green-600">
      {props.children}
    </span>
  );
}
