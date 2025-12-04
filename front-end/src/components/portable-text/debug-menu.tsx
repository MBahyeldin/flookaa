import { useEditor } from "@portabletext/editor";
import { useSelector } from "@xstate/react";
import { CopyIcon, TrashIcon } from "lucide-react";
import { reverse } from "remeda";
import type { EditorActorRef } from "./toolbar/machine";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { EditorPatchesPreview } from "./editor-patches-preview";
import { ValuePreview } from "./value-preview";
import { SelectionPreview } from "./selection-preview";

export function DebugMenu(props: {
  editorRef: EditorActorRef;
  readOnly: boolean;
}) {
  const featureFlags = useSelector(
    props.editorRef,
    (s) => s?.context?.featureFlags
  );
  const showingPatchesPreview = useSelector(props.editorRef, (s) =>
    s.matches({ "patches preview": "shown" })
  );
  const showingSelectionPreivew = useSelector(props.editorRef, (s) =>
    s.matches({ "selection preview": "shown" })
  );
  const showingValuePreview = useSelector(props.editorRef, (s) =>
    s.matches({ "value preview": "shown" })
  );
  const patchSubscriptionActive = useSelector(props.editorRef, (s) =>
    s.matches({ "patch subscription": "active" })
  );
  const valueSubscriptionActive = useSelector(props.editorRef, (s) =>
    s.matches({ "value subscription": "active" })
  );
  const patchesReceived = useSelector(props.editorRef, (s) =>
    reverse(s?.context?.patchesReceived)
  );

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Switch
          checked={patchSubscriptionActive}
          onCheckedChange={() => {
            props.editorRef.send({ type: "toggle patch subscription" });
          }}
        >
          Patch subscription
        </Switch>
      </div>
      <div>
        <Switch
          checked={valueSubscriptionActive}
          onCheckedChange={() => {
            props.editorRef.send({ type: "toggle value subscription" });
          }}
        >
          Value subscription
        </Switch>
      </div>
      <div>
        <Switch
          checked={featureFlags.dragHandles}
          onCheckedChange={() => {
            props.editorRef.send({
              type: "toggle feature flag",
              flag: "dragHandles",
            });
          }}
        >
          Drag handles (experimental)
        </Switch>
      </div>
      <Separator orientation="horizontal" />
      <div>
        <Switch
          checked={featureFlags.markdownPlugin}
          onCheckedChange={() => {
            props.editorRef.send({
              type: "toggle feature flag",
              flag: "markdownPlugin",
            });
          }}
        >
          Markdown plugin
        </Switch>
      </div>
      <div>
        <Switch
          checked={featureFlags.oneLinePlugin}
          onCheckedChange={() => {
            props.editorRef.send({
              type: "toggle feature flag",
              flag: "oneLinePlugin",
            });
          }}
        >
          One-line plugin
        </Switch>
      </div>
      <div>
        <Switch
          checked={featureFlags.emojiPickerPlugin}
          onCheckedChange={() => {
            props.editorRef.send({
              type: "toggle feature flag",
              flag: "emojiPickerPlugin",
            });
          }}
        >
          Emoji picker plugin
        </Switch>
      </div>
      <div>
        <Switch
          checked={featureFlags.codeEditorPlugin}
          onCheckedChange={() => {
            props.editorRef.send({
              type: "toggle feature flag",
              flag: "codeEditorPlugin",
            });
          }}
        >
          Code editor plugin
        </Switch>
      </div>
      <div>
        <Switch
          checked={featureFlags.linkPlugin}
          onCheckedChange={() => {
            props.editorRef.send({
              type: "toggle feature flag",
              flag: "linkPlugin",
            });
          }}
        >
          Link plugin
        </Switch>
      </div>
      <Separator orientation="horizontal" />
      <div>
        <Switch
          checked={featureFlags.imageDeserializerPlugin}
          onCheckedChange={() => {
            props.editorRef.send({
              type: "toggle feature flag",
              flag: "imageDeserializerPlugin",
            });
          }}
        >
          Image deserializer plugin
        </Switch>
      </div>
      <div>
        <Switch
          checked={featureFlags.htmlDeserializerPlugin}
          onCheckedChange={() => {
            props.editorRef.send({
              type: "toggle feature flag",
              flag: "htmlDeserializerPlugin",
            });
          }}
        >
          HTML deserializer plugin
        </Switch>
      </div>
      <div>
        <Switch
          checked={featureFlags.textFileDeserializerPlugin}
          onCheckedChange={() => {
            props.editorRef.send({
              type: "toggle feature flag",
              flag: "textFileDeserializerPlugin",
            });
          }}
        >
          Text file deserializer plugin
        </Switch>
      </div>
      <Separator orientation="horizontal" />
      <div>
        <Switch
          checked={showingPatchesPreview}
          onCheckedChange={() => {
            props.editorRef.send({ type: "toggle patches preview" });
          }}
        >
          Patches
        </Switch>
        <Tooltip>
          <TooltipTrigger>
            <Button
              size="sm"
              variant="destructive"
              onPress={() => {
                props.editorRef.send({ type: "clear stored patches" });
              }}
            >
              <TrashIcon className="size-3" />
            </Button>
            <TooltipContent>Clear patches</TooltipContent>
          </TooltipTrigger>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                props.editorRef.send({ type: "copy patches" });
              }}
            >
              <CopyIcon className="size-3" />
            </Button>
            <TooltipContent>Copy</TooltipContent>
          </TooltipTrigger>
        </Tooltip>
      </div>
      {showingPatchesPreview ? (
        <EditorPatchesPreview patches={patchesReceived} />
      ) : null}
      <div>
        <Switch
          checked={showingSelectionPreivew}
          onCheckedChange={() => {
            props.editorRef.send({ type: "toggle selection preview" });
          }}
        >
          Selection
        </Switch>
      </div>
      {showingSelectionPreivew ? (
        <SelectionPreview editorId={props.editorRef.id} />
      ) : null}
      <div>
        <Switch
          checked={showingValuePreview}
          onCheckedChange={() => {
            props.editorRef.send({ type: "toggle value preview" });
          }}
        >
          Value
        </Switch>
      </div>
      {showingValuePreview ? (
        <ValuePreview editorId={props.editorRef.id} />
      ) : null}
      <Separator orientation="horizontal" />
      <div className="flex gap-2 items-center justify-between">
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="destructive"
              size="sm"
              onPress={() => {
                props.editorRef.send({ type: "remove" });
              }}
            >
              <TrashIcon className="size-3" />
              {props.editorRef.id}
            </Button>
            <TooltipContent>Remove editor</TooltipContent>
          </TooltipTrigger>
        </Tooltip>
        <ToggleReadOnly readOnly={props.readOnly} />
      </div>
    </div>
  );
}

function ToggleReadOnly(props: { readOnly: boolean }) {
  const editor = useEditor();

  return (
    <Switch
      checked={props.readOnly}
      onCheckedChange={() => {
        editor.send({ type: "update readOnly", readOnly: !props.readOnly });
      }}
    >
      <code>readOnly</code>
    </Switch>
  );
}
