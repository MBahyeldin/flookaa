import { useMemo, useRef, useState, type ReactNode } from "react";
import { Globe, User2, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { SectionNav, SectionNavList, SectionNavTab } from "@/components/ui/section-nav";
import { useCreatePostMutation } from "@/generated/graphql";
import { type PortableTextObject, type PortableTextSpan, type PortableTextTextBlock } from "@portabletext/editor";
import { useActorRef } from "@xstate/react";
import { playgroundMachine } from "../portable-text/toolbar/machine";
import { editorIdGenerator } from "../portable-text/editor-id-generator";
import PortableText from "../portable-text";
import PostContent, { parsePostContent } from "../portable-text/PostContent";
import { validateBlocks, type InvalidBlock } from "../portable-text/validateBlocks";
import { InvalidBlocksContext } from "../portable-text/invalidBlocks";
import { BlockShortcuts } from "../portable-text/toolbar/block-shortcuts";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";
import normalizeBlocks from "@/utils/normalizeBlocks";
import { personaInitials } from "@/lib/personaInitials";
import { contentOwner, useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import {
  portableTextIsEmpty,
  portableTextLength,
} from "@/utils/portableTextContent";

const MAX_POST_LENGTH = 4*1024;
const SHOW_COUNT_FROM = Math.floor(MAX_POST_LENGTH * 0.9);

type Mode = "write" | "preview";
type Blocks = PortableTextTextBlock<PortableTextSpan | PortableTextObject>[];

// The same envelope the server stores, so the preview reads it back like the feed.
function draftContent(blocks: Blocks) {
  try {
    const rawContent = JSON.stringify({ blocks: normalizeBlocks(blocks) });
    return { rawContent, error: null, invalid: validateBlocks(parsePostContent(rawContent)) };
  } catch (error) {
    return { rawContent: null, error: String(error), invalid: [] };
  }
}

function invalidMessages(invalid: InvalidBlock[]): Map<string, string> {
  const messages = new Map<string, string>();
  for (const item of invalid) {
    if (!item.key) continue;
    const issue = (item.issues[0] ?? "needs fixing").replace(/\.$/, "");
    messages.set(item.key, `${item.block.title}: ${issue}. Fix it to post.`);
  }
  return messages;
}

export function PostCreator(props: {
  // "New post in <channelName>", or `title` when given.
  channelName: string;
  title?: string;
  // A full-screen sheet on phones, a card in place elsewhere.
  layout?: "card" | "sheet";
  // Opens that block's insert form as the composer opens.
  initialBlock?: string;
  onCancel: () => void;
  onPosted: () => void;
}) {
  const layout = props.layout ?? "card";
  const [blocks, setBlocks] = useState<Blocks>([]);
  const { persona } = useUserProfileStore();
  const [createPost] = useCreatePostMutation();
  const [isPosting, setIsPosting] = useState(false);
  const [mode, setMode] = useState<Mode>("write");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const isPostingRef = useRef(false);
  const playgroundRef = useActorRef(playgroundMachine, {
    input: {
      editorIdGenerator: editorIdGenerator(),
    },
  });
  const owner = useAppStore((state) => contentOwner(state.owner));

  /* Counts characters across the blocks' spans, not the number of blocks —
     an emptied editor still contains one block with a zero-length span. */
  const charCount = portableTextLength(blocks);
  const isEmpty = portableTextIsEmpty(blocks);
  const isOverLimit = charCount > MAX_POST_LENGTH;
  const draft = useMemo(() => draftContent(blocks), [blocks]);
  const invalid = useMemo(() => invalidMessages(draft.invalid), [draft.invalid]);
  const invalidCount = draft.invalid.length + (draft.error ? 1 : 0);
  const canSubmit = !isEmpty && !isOverLimit && invalidCount === 0;
  const displayName = persona ? `${persona.first_name} ${persona.last_name}` : "";

  const requestCancel = () => {
    if (isPosting) return;
    if (isEmpty) props.onCancel();
    else setConfirmDiscard(true);
  };

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

      await createPost({
        variables: {
          authorId: persona.id!,
          owner: owner,
          content: {
            blocks: normalizeBlocks(blocks),
          },
          tags: [],
          privacy: "PUBLIC",
          allowedPersonaIds: [],
          deniedPersonaIds: [],
        },
      });
      setBlocks([]);
      setMode("write");
      props.onPosted();
    } catch (error) {
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

  const sheet = layout === "sheet";

  const postButton = (
    <Button
      size={sheet ? "sm" : "default"}
      onClick={handleSubmit}
      disabled={!canSubmit}
      loading={isPosting}
    >
      {isPosting ? "Posting…" : "Post"}
    </Button>
  );

  const counter =
    charCount > SHOW_COUNT_FROM ? (
      <span
        className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}
        aria-live="polite"
      >
        {charCount}/{MAX_POST_LENGTH}
      </span>
    ) : null;

  const visibility = (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <Globe aria-hidden className="size-3.5 shrink-0" />
      Visible to everyone who can read this channel
    </span>
  );

  const header = (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={persona?.thumbnail} />
        <AvatarFallback className="bg-accent text-xs text-primary">
          {persona ? personaInitials(persona) : <User2 className="size-4" />}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">Posting as {displayName}</span>
    </div>
  );

  const tabs =
    !isEmpty || mode === "preview" ? (
      <SectionNav value={mode} onValueChange={(value) => setMode(value as Mode)}>
        <SectionNavList className="static px-4">
          <SectionNavTab value="write">Write</SectionNavTab>
          <SectionNavTab value="preview">Preview</SectionNavTab>
        </SectionNavList>
      </SectionNav>
    ) : null;

  const body = (
    <>
      {/* Hidden rather than unmounted, so the editor keeps selection and undo. */}
      <div className={mode !== "write" ? "hidden" : sheet ? "flex min-h-0 flex-1 flex-col" : undefined}>
        <InvalidBlocksContext.Provider value={invalid}>
          <PortableText
            playgroundRef={playgroundRef}
            value={blocks}
            setValue={setBlocks}
            autoFocus={!props.initialBlock}
            fill={sheet}
            footer={
              <>
                {sheet && visibility}
                <BlockShortcuts initialBlock={props.initialBlock} />
              </>
            }
          />
        </InvalidBlocksContext.Provider>
      </div>

      {mode === "preview" && (
        <div className={sheet ? "min-h-0 flex-1 overflow-y-auto" : undefined}>
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
    </>
  );

  const discardDialog = (
    <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Discard this post?</DialogTitle>
          <DialogDescription>What you’ve written will be lost.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDiscard(false)}>
            Keep writing
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setConfirmDiscard(false);
              props.onCancel();
            }}
          >
            Discard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  let frame: ReactNode;
  if (sheet) {
    frame = (
      <Sheet open onOpenChange={(open) => !open && requestCancel()}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-dvh gap-0 rounded-none border-t-0 bg-card p-0"
        >
          <div className="flex items-center gap-2 border-b border-border px-2 py-2">
            <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={requestCancel}>
              <XIcon className="size-5" />
            </Button>
            <SheetTitle className="min-w-0 flex-1 truncate text-center text-sm font-medium">
              {props.title ?? `New post in ${props.channelName}`}
            </SheetTitle>
            <SheetDescription className="sr-only">Write a post as {displayName}</SheetDescription>
            {postButton}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3.5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {header}
            {tabs}
            {body}
            {counter && <div className="flex justify-end">{counter}</div>}
            {draft.error && <p role="alert" className="text-xs text-destructive">{draft.error}</p>}
          </div>
        </SheetContent>
      </Sheet>
    );
  } else {
    frame = (
      <div className="flex min-w-0 flex-col gap-3.5 rounded-lg border border-primary bg-card p-5">
        {header}
        {tabs}
        {body}
        {draft.error && <p role="alert" className="text-xs text-destructive">{draft.error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {visibility}
          <div className="ms-auto flex items-center gap-2">
            {counter}
            <Button variant="outline" onClick={requestCancel} disabled={isPosting}>
              Cancel
            </Button>
            {postButton}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {frame}
      {discardDialog}
    </>
  );
}
