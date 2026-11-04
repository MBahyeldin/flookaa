import { useRef, useState } from "react";
import uploadFile from "@/services/uploadFile";
import { t } from "@/i18n";

export function useFileUpload(onChange: (url: string) => void) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFailed(null);
    try {
      onChange(await uploadFile(file));
    } catch (err) {
      setFailed(err instanceof Error ? err.message : t("common:upload.failed"));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return { input, uploading, failed, pick };
}
