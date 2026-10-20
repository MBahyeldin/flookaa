import uploadFile from "@/services/uploadFile";
import type { FormFieldProps } from "@/types/FormFields";
import { useState } from "react";
import { toast } from "sonner";

// Mirrors maxImageSide in shared/util/portableText/block-objects/image.go.
const MAX_SIDE = 4096;

async function measure(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  } catch {
    return undefined;
  }
}

export default function useInputImage({
  initValue,
  setFieldValue,
  id,
  dimensions,
}: {
  initValue: string;
  setFieldValue: FormFieldProps["setFieldValue"];
  id: string;
  dimensions?: { width: string; height: string };
}) {
  const [url, setUrl] = useState<string | null>(initValue);
  // Exposed so the picture inputs can show progress; uploads here go through
  // the same chunked path as comment images and can take a while.
  const [isUploading, setIsUploading] = useState(false);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setUrl(null);
      return;
    }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => setUrl(reader.result as string);
      reader.readAsDataURL(file);
      const [url, size] = await Promise.all([
        uploadFile(file),
        dimensions ? measure(file) : undefined,
      ]);

      // Set together with src so a failed upload keeps the old pair.
      if (dimensions) {
        setFieldValue(dimensions.width, size?.width, false);
        setFieldValue(dimensions.height, size?.height, false);
      }
      // Validates last, so a "required" error clears once the image is in.
      setFieldValue(id, url, true);
    } catch (error) {
      console.error("Image upload failed:", error);
      setUrl(null);
      // Show what actually went wrong — "please try again" is useless advice
      // when the cause is a file that will always be too large.
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image."
      );
    } finally {
      setIsUploading(false);
      // Allow re-picking the same file after a failure — otherwise selecting
      // it again fires no change event and the retry looks dead.
      e.target.value = "";
    }
  };
  return { url, handleInputChange, isUploading };
}
