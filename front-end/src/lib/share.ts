import { toast } from "sonner";
import { t } from "@/i18n";

// The share sheet on touch devices; elsewhere the link goes to the clipboard.
export async function shareLink(url: string, title: string) {
  if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ url, title });
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.error(t("common:share.shareFailed"));
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success(t("common:share.copied"));
  } catch {
    toast.error(t("common:share.copyFailed"));
  }
}
