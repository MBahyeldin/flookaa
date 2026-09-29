import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Post } from "@/components/post-card";
import { GetPostsDocument, type GetPostsQuery } from "@/generated/graphql";
import client from "@/graphql/client";
import { isCurrentOwner, useAppStore } from "@/stores/AppStore";

/**
 * Opens ?post=<id> (a notification link) in a dialog with its comments shown,
 * whether or not the post is on the feed's current page. The post goes into
 * the page's store so likes and comments update it like any feed post.
 * Closing the dialog removes the query params.
 *
 * ?comment=<id> is carried by the link but not used yet: scrolling to a
 * comment would mean expanding every collapsed reply level above it.
 */
export default function PostDialog({
  channelId,
  isStoreOnThisChannel,
}: {
  channelId: string | undefined;
  /** False until the page has pointed the store at this channel. */
  isStoreOnThisChannel: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const postId = searchParams.get("post");
  const post = useAppStore((s) => (postId ? s.posts[postId] : undefined));
  const addPosts = useAppStore((s) => s.addPosts);
  const requested = useRef<string | null>(null);

  const close = () =>
    setSearchParams(
      (params) => {
        params.delete("post");
        params.delete("comment");
        return params;
      },
      { replace: true }
    );

  useEffect(() => {
    if (!postId || !isStoreOnThisChannel || post || requested.current === postId) return;
    const channelIdNum = parseInt(channelId ?? "", 10);
    if (isNaN(channelIdNum)) return;
    requested.current = postId;

    const owner = useAppStore.getState().owner;
    client
      .query<GetPostsQuery>({
        query: GetPostsDocument,
        variables: {
          ids: [postId],
          limit: 1,
          offset: 0,
          owner: { id: channelIdNum, type: "CHANNEL" },
        },
        fetchPolicy: "network-only",
      })
      .then(({ data }) => {
        if (!owner || !isCurrentOwner(owner)) return;
        const found = data?.getPosts ?? [];
        if (found.length === 0) {
          toast.error("This post is no longer available");
          close();
          return;
        }
        addPosts(found);
      })
      .catch(() => {
        toast.error("This post is no longer available");
        close();
      });
    // close is stable enough: it only touches the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, isStoreOnThisChannel, post, channelId, addPosts]);

  return (
    <Dialog open={!!postId && !!post} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">Post</DialogTitle>
        {post && <Post post={post} initialShowComments />}
      </DialogContent>
    </Dialog>
  );
}
