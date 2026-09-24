import { Button } from "@/components/ui/button";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import useInputImage from "@/hooks/useInpuImage";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "@/types/FormFields";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Camera, Loader2, User } from "lucide-react";
import { useRef, useState } from "react";

type ProfilePictureInputProps = FormFieldProps & {
  first_name?: string;
  last_name?: string;
  email?: string;
};

export default function ProfilePictureInput({
  setFieldValue,
  first_name,
  last_name,
  initValue,
  email,
  field,
}: ProfilePictureInputProps) {
  const thumbnailInputField = useRef<HTMLInputElement | null>(null);
  const [showPreview] = useState(false);

  const { url, handleInputChange, isUploading } = useInputImage({
    initValue: initValue || "",
    setFieldValue,
    id: "thumbnail",
  });

  return (
    <div className={cn("flex items-center gap-6", field.width)}>
      <div className="relative">
        <Avatar className="cursor-pointer">
          <DialogTrigger asChild>
            <AvatarImage
              src={url || "/placeholder.svg"}
              alt="Profile picture"
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover border"
            />
          </DialogTrigger>

          <AvatarFallback className="text-lg">
            <User className="h-12 w-12 text-foreground" />
          </AvatarFallback>
        </Avatar>

        {/* Overlays the avatar itself, so progress appears exactly where the
            result will — the old flow gave no feedback at all between
            picking a file and the picture changing. */}
        {isUploading && (
          <div
            role="status"
            aria-label="Uploading image"
            className="absolute inset-0 flex h-24 w-24 items-center justify-center rounded-full bg-background/70 backdrop-blur-[1px]"
          >
            <Loader2 className="h-6 w-6 animate-spin text-foreground" />
          </div>
        )}
        <input
          type="file"
          id="avatar"
          accept="image/*"
          className="hidden"
          ref={thumbnailInputField}
          onChange={handleInputChange}
        />
        <Button
          size="sm"
          variant="secondary"
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
          onClick={() => {
            thumbnailInputField.current?.click();
          }}
          disabled={isUploading}
          aria-label={isUploading ? "Uploading image…" : "Change profile picture"}
          type="button"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <h3 className="font-semibold text-lg">
          {first_name} {last_name}
        </h3>
        <p className="text-muted-foreground">{email}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 bg-transparent"
          onClick={() => thumbnailInputField.current?.click()}
          disabled={isUploading}
          aria-busy={isUploading}
          type="button"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            "Change Avatar"
          )}
        </Button>
      </div>
      {url && showPreview && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle asChild>
            <h2 className="text-sm font-medium">Preview</h2>
          </DialogTitle>

          <img src={url} alt="Avatar Preview" className="w-full h-auto" />
        </DialogContent>
      )}
    </div>
  );
}
