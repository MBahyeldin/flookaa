import { Button } from "@/components/ui/button";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import useInputImage from "@/hooks/useInpuImage";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "@/types/FormFields";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Camera, User } from "lucide-react";
import { useRef } from "react";

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

  const { url, handleInputChange } = useInputImage({
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
            <User className="h-12 w-12 text-gray-400" />
          </AvatarFallback>
        </Avatar>
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
          type="button"
        >
          Change Avatar
        </Button>
      </div>
      {url && (
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
