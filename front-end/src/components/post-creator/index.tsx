"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User2 } from "lucide-react";
import { useCreatePostMutation } from "@/generated/graphql";
import { type PortableTextObject, type PortableTextSpan, type PortableTextTextBlock } from "@portabletext/editor";
import { useActorRef } from "@xstate/react";
import { playgroundMachine } from "../portable-text/toolbar/machine";
import { editorIdGenerator } from "../portable-text/editor-id-generator";
import PortableText from "../portable-text";
import PostContent, { parsePostContent } from "../portable-text/PostContent";
import { validateBlocks } from "../portable-text/validateBlocks";
import { PostHeader } from "../post-card/PostHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";
import normalizeBlocks from "@/utils/normalizeBlocks";
import { useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import {
  portableTextIsEmpty,
  portableTextLength,
} from "@/utils/portableTextContent";

const MAX_POST_LENGTH = 4*1024;

type Mode = "write" | "preview";

// The same envelope the server stores, so the preview reads it back like the feed.
function draftContent(blocks: PortableTextTextBlock<PortableTextSpan | PortableTextObject>[]) {
  try {
    const rawContent = JSON.stringify({ blocks: normalizeBlocks(blocks) });
    return { rawContent, error: null, invalid: validateBlocks(parsePostContent(rawContent)) };
  } catch (error) {
    return { rawContent: null, error: String(error), invalid: [] };
  }
}


export function PostCreator({ onCancel, onPosted }: { onCancel?: () => void; onPosted?: () => void } = {}) {
  const [blocks, setBlocks] = useState<PortableTextTextBlock<PortableTextSpan | PortableTextObject>[]>([]);
  const { persona } = useUserProfileStore();
  const [createPost] = useCreatePostMutation();
  const [syncPortableTextEditor, setSyncPortableTextEditor] =
    useState<boolean>(false);
  const [isPosting, setIsPosting] = useState(false);
  const [mode, setMode] = useState<Mode>("write");
  const isPostingRef = useRef(false);
  const playgroundRef = useActorRef(playgroundMachine, {
    input: {
      editorIdGenerator: editorIdGenerator(),
    },
  });
  const owner = useAppStore((state) => state.owner);

  /* Counts characters across the blocks' spans, not the number of blocks —
     an emptied editor still contains one block with a zero-length span. */
  const charCount = portableTextLength(blocks);
  const isEmpty = portableTextIsEmpty(blocks);
  const isOverLimit = charCount > MAX_POST_LENGTH;
  const draft = useMemo(() => draftContent(blocks), [blocks]);
  const invalidCount = draft.invalid.length + (draft.error ? 1 : 0);
  const canSubmit = !isEmpty && !isOverLimit && invalidCount === 0;

  const handleSubmit = async () => {
    if (!persona || !canSubmit) return;

    // Ref as well as state: state updates are async, so two clicks landing in
    // the same tick would both pass a state-only check and publish twice.
    if (isPostingRef.current) return;
    isPostingRef.current = true;
    setIsPosting(true);

    try {
      if (!owner) {
        console.error("Owner is not set in AppStore");
        return;
      }

      const normalizedBlocks = normalizeBlocks(blocks);

      await createPost({
        variables: {
          authorId: persona.id!,
          owner: owner,
          content: {
            blocks: normalizedBlocks,
          },
          tags: [],
          privacy: "PUBLIC",
          allowedPersonaIds: [],
          deniedPersonaIds: [],
        },
      });
      setBlocks(() => []);
      setSyncPortableTextEditor(!syncPortableTextEditor);
      setMode("write");
      onPosted?.();
    } catch (error) {
      // Without this the draft was cleared even when the mutation failed.
      console.error("Failed to publish post:", error);
      toast.error(
        CombinedGraphQLErrors.is(error)
          ? error.errors[0]?.message || "Couldn’t publish the post."
          : "Couldn’t publish the post. Check your connection."
      );
    } finally {
      isPostingRef.current = false;
      setIsPosting(false);
    }
  };


  return (
    <Card className="p-4 mb-6 bg-card border-border">
      {/*
        The avatar used to sit beside the editor, which cost the editor its
        avatar-width column. It's now a header line of its own, so the editor
        spans the card's full width.
      */}
      <div className="min-w-0 space-y-3">
        <div className="flex min-w-0 items-center gap-2">
          {mode === "write" && (
            <>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={persona?.thumbnail} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <User2 className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">
                {persona?.first_name} {persona?.last_name}
              </span>
            </>
          )}
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as Mode)}
            className="ml-auto shrink-0"
          >
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="min-w-0">
          {/* Hidden rather than unmounted, so the editor keeps selection and undo. */}
          <div hidden={mode !== "write"}>
            <PortableText
              playgroundRef={playgroundRef}
              value={blocks}
              setValue={setBlocks}
            />
          </div>

          {mode === "preview" && persona && (
            <div>
              <PostHeader
                authorId={persona.id}
                author={{
                  fullName: `${persona.first_name} ${persona.last_name}`,
                  username: `${persona.first_name} ${persona.last_name}`,
                  profileImageUrl: persona.thumbnail,
                  anonymous: false,
                }}
                createdAt={new Date().toISOString()}
              />
              {draft.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {draft.error}
                </p>
              ) : isEmpty ? (
                <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
              ) : (
                <PostContent rawContent={draft.rawContent} showInvalid />
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-border">
            {invalidCount > 0 && (
              <button
                type="button"
                onClick={() => setMode("preview")}
                className="text-sm text-destructive underline-offset-4 hover:underline"
              >
                {invalidCount === 1
                  ? "1 block needs fixing"
                  : `${invalidCount} blocks need fixing`}
                {mode === "write" && " — see Preview"}
              </button>
            )}
            {/* ml-auto keeps the counter + Post on the right. */}
            <div className="ml-auto flex items-center gap-2">
              <span
                className={`text-sm ${
                  isOverLimit ? "text-destructive" : "text-muted-foreground"
                }`}
                aria-live="polite"
              >
                {charCount}/{MAX_POST_LENGTH}
              </span>
              {onCancel && (
                <Button variant="outline" onClick={onCancel} disabled={isPosting}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={isPosting}
              >
                {isPosting ? "Posting…" : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
