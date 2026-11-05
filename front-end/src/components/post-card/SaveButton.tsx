import type { MouseEvent } from "react";
import { Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Post } from "@/generated/graphql";
import { cn } from "@/lib/utils";
import { useSavePost } from "./useSavePost";

export function SaveButton({
  post,
  labelled = false,
  className,
}: {
  post: Post;
  labelled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("posts");
  const { saved, toggleSave } = useSavePost(post);

  // A masonry tile is one big link; Save must not open the post.
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSave();
  };
  const icon = <Bookmark aria-hidden className={cn("size-4", saved && "fill-primary stroke-primary")} />;

  if (labelled) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={cn(className, saved && "text-primary hover:text-primary")}
      >
        {icon}
        {saved ? t("save.saved") : t("save.save")}
      </button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? t("save.savedLabel") : t("save.saveLabel")}
      className={cn("shrink-0", className)}
    >
      {icon}
    </Button>
  );
}
