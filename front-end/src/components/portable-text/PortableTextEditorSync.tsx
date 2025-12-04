import { type PortableTextBlock, useEditor } from "@portabletext/editor";
import { useEffect } from "react";

function PortableTextEditorSync({ value }: { value: PortableTextBlock[] }) {
  const editor = useEditor();

  useEffect(() => {
    if (!editor) return;
    editor.send({
      type: "update value",
      value: value ?? [],
    });
  }, [value, editor]);

  return null;
}

export default PortableTextEditorSync;
