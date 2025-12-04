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

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setUrl(null);
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = () => setUrl(reader.result as string);
      reader.readAsDataURL(file);
      const url = await uploadFile(file);
      console.log("Uploaded file URL:", url);

      setFieldValue(
        id,
        url,
        // you might want to validate on file upload
        // use some AI to validate image content?
        false
      );
    } catch (_err) {
      console.error(_err);
      setUrl(null);
      toast.error("Failed to upload image. Please try again.");
    }
  };
  return { url, handleInputChange };
}
