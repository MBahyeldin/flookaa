import { toast } from "sonner";

// The share sheet on touch devices; elsewhere the link goes to the clipboard.
export async function shareLink(url: string, title: string) {
  if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ url, title });
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.error("Couldn't share the link");
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy the link");
  }
}
