import uploadFile from "@/services/uploadFile";
import type { FormFieldProps } from "@/types/FormFields";
import { useState } from "react";
import { toast } from "sonner";

export default function useInputImage({
  initValue,
  setFieldValue,
  id,
}: {
  initValue: string;
  setFieldValue: FormFieldProps["setFieldValue"];
  id: string;
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
      const url = await uploadFile(file);

      setFieldValue(
        id,
        url,
        // you might want to validate on file upload
        // use some AI to validate image content?
        false
      );
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
