import { useSelector } from "@xstate/react";
import type { PlaygroundActorRef } from "./toolbar/machine";
import { PlaygroundFeatureFlagsContext } from "./toolbar/feature-flags";
import Editor from "./editor";
import { useMemo } from "react";
import type { PortableTextBlock } from "@portabletext/block-tools";

export default function PortableText(props: {
  playgroundRef: PlaygroundActorRef;
  value: PortableTextBlock[];
  setValue: (blocks: PortableTextBlock[]) => void;
}) {
  const playgroundFeatureFlags = useSelector(
    props.playgroundRef,
    (s) => s.context.featureFlags
  );
  const editors = useSelector(props.playgroundRef, (s) => s.context.editors);
  const editor = useMemo(() => {
    const firstEditor = editors[0]!;
    firstEditor.send({ type: "value", value: props.value });
    return firstEditor;
  }, [editors, props]);
  const rangeDecorations = useSelector(
    props.playgroundRef,
    (s) => s.context.rangeDecorations
  );

  return (
    <div className="p-2 md:p-4 flex flex-col gap-2 md:gap-4">
      <PlaygroundFeatureFlagsContext.Provider value={playgroundFeatureFlags}>
        <Editor
          key={editor.id}
          editorRef={editor}
          rangeDecorations={rangeDecorations}
          setValue={props.setValue}
        />
      </PlaygroundFeatureFlagsContext.Provider>
    </div>
  );
}
