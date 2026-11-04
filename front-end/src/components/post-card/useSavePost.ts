import { useRef } from "react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SavePostDocument, UnsavePostDocument, type Post } from "@/generated/graphql";
import { t } from "@/i18n";
import { graphqlErrorMessage } from "@/lib/errors";
import { useAppStore } from "@/stores/AppStore";

export function useSavePost(post: Post) {
  const navigate = useNavigate();
  const [savePost] = useMutation(SavePostDocument);
  const [unsavePost] = useMutation(UnsavePostDocument);
  const busy = useRef(false);
  const saved = post.personalizedMeta?.savedByPersona ?? false;

  const toggleSave = async () => {
    if (busy.current) return;
    busy.current = true;
    const next = !saved;
    const { setPostSaved } = useAppStore.getState();
    setPostSaved(post._id, next);
    try {
      await (next ? savePost : unsavePost)({ variables: { id: post._id } });
      if (next) {
        toast.success(t("posts:save.saved"), {
          position: "bottom-center",
          action: { label: t("posts:save.view"), onClick: () => navigate("/saved") },
          classNames: { actionButton: "!bg-transparent !text-sm !font-medium !text-foreground" },
        });
      }
    } catch (err) {
      setPostSaved(post._id, !next);
      toast.error(
        graphqlErrorMessage(CombinedGraphQLErrors.is(err) ? err : null, t("posts:save.failed"), t("posts:save.offline"))
      );
    } finally {
      busy.current = false;
    }
  };

  return { saved, toggleSave };
}
