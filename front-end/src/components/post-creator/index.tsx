"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageIcon, Smile, Calendar, User2 } from "lucide-react";
import { useAuth } from "@/Auth.context";
import { useCreatePostMutation } from "@/generated/graphql";
import { type PortableTextBlock } from "@portabletext/editor";
import { useActorRef } from "@xstate/react";
import { playgroundMachine } from "../portable-text/toolbar/machine";
import { editorIdGenerator } from "../portable-text/editor-id-generator";
import PortableText from "../portable-text";
import { useBlockObjectsProvider } from "@/BlockObjectsProvider.context";
import normalizeBlocks from "@/utils/normalizeBlocks";
import { useAppStore } from "@/stores/AppStore";


export function PostCreator() {
  const [blocks, setBlocks] = useState<PortableTextBlock[]>([]);
  const { user } = useAuth();
  const [createPost] = useCreatePostMutation();
  const [syncPortableTextEditor, setSyncPortableTextEditor] =
    useState<boolean>(false);
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

  const handleSubmit = async () => {
    if (!user) return;
    
    if (!owner) {
      console.error("Owner is not set in AppStore");
      return;
    }

    const normalizedBlocks = normalizeBlocks(blocks, types);

    await createPost({
      variables: {
        authorId: user.id!,
        owner: owner,
        content: {
          blocks: normalizedBlocks,
        },
        tags: [],
        privacy: "PUBLIC",
        allowedUserIds: [],
        deniedUserIds: [],
      },
    });
    setBlocks(() => []);
    setSyncPortableTextEditor(!syncPortableTextEditor);
  };

  console.log("bbb", blocks);

  return (
    <Card className="p-4 mb-6 bg-card border-border">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 mt-1">
          <AvatarImage src={user?.thumbnail} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User2 className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <PortableText
            playgroundRef={playgroundRef}
            value={blocks}
            setValue={setBlocks}
          />

          <div className="flex items-center justify-between pt-3 border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Photo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
              >
                <Smile className="h-4 w-4 mr-1" />
                Emoji
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-sm ${
                  blocks.length > 280
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {blocks.length}/280
              </span>
              <Button
                onClick={handleSubmit}
                disabled={!blocks.length || blocks.length > 280}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
