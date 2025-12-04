import { useActorRef } from "@xstate/react";
import { useEffect } from "react";
import { highlightMachine } from "./highlight-json-machine";
import type { PlaygroundActorRef } from "./toolbar/machine";

export function PortableTextPreview(props: {
  playgroundRef: PlaygroundActorRef;
}) {
  const highlightRef = useActorRef(highlightMachine, {
    input: {
      code: JSON.stringify(
        props.playgroundRef.getSnapshot().context.value ?? null
      ),
      variant: "ghost",
    },
  });

  useEffect(() => {
    props.playgroundRef.subscribe((s) => {
      highlightRef.send({
        type: "update code",
        code: JSON.stringify(s.context.value ?? null),
      });
    });
  }, [props.playgroundRef, highlightRef]);

  return (
    <>
      <div>wait for me!</div>
    </>
  );
}
