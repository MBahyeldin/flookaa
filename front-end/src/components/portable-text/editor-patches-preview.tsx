import { omit } from "remeda";
import { tv } from "tailwind-variants";
import type { EditorActorRef } from "./toolbar/machine";

type EditorPatch = ReturnType<
  EditorActorRef["getSnapshot"]
>["context"]["patchesReceived"][number];

const patchVariants = tv({
  variants: {
    age: {
      new: "text-emerald-600",
      old: "text-slate-600",
    },
    origin: {
      local: "opacity-50",
      remote: "",
    },
  },
});

export function EditorPatchesPreview(props: { patches: Array<EditorPatch> }) {
  if (props.patches.length === 0) {
    return (
      <div>
        <pre>null</pre>
      </div>
    );
  }

  return (
    <div>
      <pre className="max-h-56 overflow-y-auto">
        {props.patches.map((patch) => (
          <code
            key={patch.id}
            className={patchVariants({
              age: patch.new ? "new" : "old",
              origin: patch.origin === "remote" ? "remote" : "local",
            })}
          >
            {patch.origin === "remote" ? "↓" : "↑"}{" "}
            {JSON.stringify(omit(patch, ["id", "origin", "new"]))}
            {"\n"}
          </code>
        ))}
      </pre>
    </div>
  );
}
