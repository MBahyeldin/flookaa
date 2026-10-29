import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import type { PaletteId } from "@/themes/palettes";
import uploadFile from "@/services/uploadFile";

export function LogoUpload({
  name,
  theme,
  value,
  onChange,
  error,
}: {
  name: string;
  theme: PaletteId;
  value: string;
  onChange: (url: string) => void;
  /** A server error about the logo. */
  error?: string;
}) {
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
      setFailed(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  const note = failed ?? error;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span data-theme={theme}>
        <Logo name={name || "?"} src={value || null} size="xl" className="border-0" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => input.current?.click()}>
            {!uploading && <Upload />}
            {uploading ? "Uploading…" : failed ? "Try again" : value ? "Replace logo" : "Upload logo"}
          </Button>
          {value && !uploading && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
        <p role={note ? "alert" : undefined} className={note ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {note ?? "Square image, PNG or JPG. Without one, the initials show."}
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  );
}
