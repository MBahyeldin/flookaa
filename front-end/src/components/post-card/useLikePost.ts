import { useEffect, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";
import { useMutation } from "@apollo/client/react";
import { CreateLikeDocument, type Post } from "@/generated/graphql";
import useAudioContext from "@/hooks/useAudioContext";
import { useUserProfileStore } from "@/stores/UserProfileStore";

export function useLikePost(post: Post) {
  const { persona } = useUserProfileStore();
  const [createLike] = useMutation(CreateLikeDocument);
  const { playSound } = useAudioContext();

  const [liked, setLiked] = useState(post.personalizedMeta?.likedByPersona || false);
  const [likes, setLikes] = useState(post.meta?.likesCount || 0);
  const [burst, setBurst] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const toggleLike = async () => {
    if (!persona?.id || isLiking) return;
    const nextLiked = !liked;

    // Wait for the server before flipping `liked`: a rejected like (e.g. "join
    // the channel first") must not animate.
    setIsLiking(true);
    try {
      await createLike({
        variables: {
          targetId: post._id,
          targetType: "POST",
          liked: nextLiked,
          owner: { id: post.owner.id, type: post.owner.type },
        },
      });
    } catch (err) {
      toast.error(
        CombinedGraphQLErrors.is(err)
          ? err.errors[0]?.message || "Couldn’t update your like."
          : "Couldn’t update your like. Check your connection."
      );
      return;
    } finally {
      setIsLiking(false);
    }

    setLiked(nextLiked);
    // Only the viewer's own like plays the sound, from the click so autoplay allows it.
    if (nextLiked) playSound("HEART_REACT");
  };

  useEffect(() => {
    // Anyone's like is worth showing; the sound is only for the viewer's own.
    if (post.meta?.likesCount > likes) setBurst(true);
    setLikes(post.meta?.likesCount || 0);
  }, [likes, post.meta?.likesCount]);

  return { liked, likes, toggleLike, burst, endBurst: () => setBurst(false) };
}
