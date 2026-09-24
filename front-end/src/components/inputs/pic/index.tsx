import { useRef } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import useInputImage from "@/hooks/useInpuImage";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "@/types/FormFields";

export default function PicInput({
  field,
  error,
  className,
  initValue,
  touched,
  setFieldValue,
}: FormFieldProps) {
  const { url, handleInputChange, isUploading } = useInputImage({
    id: field.id,
    initValue: initValue || "",
    setFieldValue,
  });
  const thumbnailInputField = useRef<HTMLInputElement | null>(null);

  return (
    <div className={cn(className, field.width)}>
      {field.icon}
      <Label htmlFor="thumbnail">
        {field.label}{" "}
        {field.isRequired && <span className="text-destructive">*</span>}
      </Label>

      <div
        className={cn(
          "mt-2 border-2 border-dashed border-muted rounded-lg p-4 flex flex-col items-center justify-center",
          // Ignore clicks mid-upload: a second pick would start a competing
          // upload and the later response would win regardless of order.
          isUploading
            ? "cursor-progress opacity-70 pointer-events-none"
            : "cursor-pointer hover:border-primary"
        )}
        aria-busy={isUploading}
        onClick={() => {
          if (isUploading) return;
          thumbnailInputField.current?.click();
        }}
      >
        {url && (
          <Card className="mt-4 w-48">
            <CardContent className="p-1">
              <img
                src={url}
                alt="Thumbnail preview"
                className="w-full h-auto rounded"
              />
            </CardContent>
          </Card>
        )}
        <input
          ref={thumbnailInputField}
          type="file"
          id="thumbnail"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
        {isUploading ? (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading image…
          </p>
        ) : (
          <p className="text-foreground">Drag & drop an image or click to select</p>
        )}
      </div>

      {error && touched && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
