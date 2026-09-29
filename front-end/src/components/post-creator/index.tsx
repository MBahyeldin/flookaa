"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User2, Loader2 } from "lucide-react";
import { useCreatePostMutation } from "@/generated/graphql";
import { type PortableTextObject, type PortableTextSpan, type PortableTextTextBlock } from "@portabletext/editor";
import { useActorRef } from "@xstate/react";
import { playgroundMachine } from "../portable-text/toolbar/machine";
import { editorIdGenerator } from "../portable-text/editor-id-generator";
import PortableText from "../portable-text";
import { useBlockObjectsProvider } from "@/BlockObjectsProvider.context";
import normalizeBlocks from "@/utils/normalizeBlocks";
import { useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import {
  portableTextIsEmpty,
  portableTextLength,
} from "@/utils/portableTextContent";

const MAX_POST_LENGTH = 4*1024;


export function PostCreator() {
  const [blocks, setBlocks] = useState<PortableTextTextBlock<PortableTextSpan | PortableTextObject>[]>([]);
  const { persona } = useUserProfileStore();
  const [createPost] = useCreatePostMutation();
  const [syncPortableTextEditor, setSyncPortableTextEditor] =
    useState<boolean>(false);
  const [isPosting, setIsPosting] = useState(false);
  const isPostingRef = useRef(false);
  const playgroundRef = useActorRef(playgroundMachine, {
    input: {
      editorIdGenerator: editorIdGenerator(),
    },
  });
  const owner = useAppStore((state) => state.owner);
  const { blockObjectsProvider } = useBlockObjectsProvider();
  const types = useMemo(() => {
    return blockObjectsProvider?.getBlockTypes() || [];
  }, [blockObjectsProvider]);

  /* Counts characters across the blocks' spans, not the number of blocks —
     an emptied editor still contains one block with a zero-length span. */
  const charCount = portableTextLength(blocks);
  const isEmpty = portableTextIsEmpty(blocks);
  const isOverLimit = charCount > MAX_POST_LENGTH;
  const canSubmit = !isEmpty && !isOverLimit;

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

      const normalizedBlocks = normalizeBlocks(blocks, types);

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
    } catch (error) {
      // Without this the draft was cleared even when the mutation failed.
      console.error("Failed to publish post:", error);
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
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={persona?.thumbnail} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              <User2 className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">
            {persona?.first_name} {persona?.last_name}
          </span>
        </div>

        <div className="min-w-0">
          <PortableText
            playgroundRef={playgroundRef}
            value={blocks}
            setValue={setBlocks}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-border">
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
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isPosting}
                aria-busy={isPosting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Posting…
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
