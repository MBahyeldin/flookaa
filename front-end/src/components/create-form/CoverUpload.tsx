import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CoverPositioner, type CoverFocus } from "@/components/manage/CoverPositioner";
import { useFileUpload } from "./useFileUpload";
import { t } from "@/i18n";

export function CoverUpload({
  value,
  focus,
  onChange,
  onFocusChange,
  error,
}: {
  value: string;
  focus: CoverFocus;
  /** "" removes the photo. */
  onChange: (url: string) => void;
  onFocusChange: (focus: CoverFocus) => void;
  /** A server error about the photo. */
  error?: string;
}) {
  const { input, uploading, failed, pick } = useFileUpload(onChange);
  const note = failed ?? error;
  const hint = value ? t("common:coverPhoto.positionHint") : t("common:coverPhoto.hint");

  return (
    <div className="flex flex-col gap-2.5">
      <Label>{t("common:coverPhoto.label")}</Label>
      {value && <CoverPositioner src={value} focus={focus} onChange={onFocusChange} />}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => input.current?.click()}>
          {!uploading && !failed && <Upload />}
          {uploading
            ? t("common:coverPhoto.uploading")
            : failed
              ? t("common:actions.tryAgain")
              : value
                ? t("common:coverPhoto.replace")
                : t("common:coverPhoto.upload")}
        </Button>
        {value && !uploading && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            {t("common:actions.remove")}
          </Button>
        )}
      </div>
      <p role={note ? "alert" : undefined} className={note ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {note ?? hint}
      </p>
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
