import { Image } from "lucide-react";
import BlockObject from "../BlockObject";
import { FormField } from "@/models/Forms/FormField";
import { cn } from "@/lib/utils";

export type ImageValue = {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};

const imageFormFields: FormField[] = [
  new FormField({
    id: "src",
    name: "src",
    label: "Image URL",
    type: "string",
    interfaceType: "pic",
    placeholder: "https://example.com/jpg",
    isRequired: true,
    width: "full",
  }),
  new FormField({
    id: "alt",
    name: "alt",
    label: "Alt Text",
    type: "string",
    interfaceType: "text",
    placeholder: "A description of the image for accessibility",
    isRequired: false,
    width: "full",
  }),
  new FormField({
    id: "caption",
    name: "caption",
    label: "Caption",
    type: "string",
    interfaceType: "text",
    placeholder: "Caption for the image (optional)",
    isRequired: false,
    width: "full",
  }),
  new FormField({
    id: "width",
    name: "width",
    label: "Width (px)",
    type: "number",
    interfaceType: "number",
    placeholder: "Width in pixels (optional)",
    isRequired: false,
    width: "1/2",
    validate: (value) => {
      if (value !== undefined && (isNaN(Number(value)) || Number(value) <= 0)) {
        return "Width must be a positive number";
      }
      return null;
    },
  }),
  new FormField({
    id: "height",
    name: "height",
    label: "Height (px)",
    type: "number",
    interfaceType: "number",
    placeholder: "Height in pixels (optional)",
    isRequired: false,
    width: "1/2",
    validate: (value) => {
      if (value !== undefined && (isNaN(Number(value)) || Number(value) <= 0)) {
        return "Height must be a positive number";
      }
      return null;
    },
  }),
];

// name, type, options
const ImageBlockObject = new BlockObject<ImageValue>({
  name: "image",
  title: "Image",
  icon: <Image className="h-5 w-5" />,
  options: { hotspot: true },
  fields: imageFormFields,
  renderBlock: renderBlock,
});


function renderBlock(props: {
  value: ImageValue;
  selected?: boolean;
  focused?: boolean;
}) {
  const { value } = props;

  if (!value || !value.src) {
    return null;
  }
  return (
    <figure className="my-3">
      {/*
        max-h-[70vh] + object-contain: with only `max-w-full`, a tall image
        rendered at full intrinsic height and dwarfed the rest of the feed.
        width/height are forwarded so the browser can reserve space and avoid
        layout shift while loading.
      */}
      <img
        className={cn(
          "max-w-full max-h-[70vh] w-auto h-auto rounded-md object-contain"
        )}
        src={value.src}
        alt={value.alt ?? ""}
        width={value.width}
        height={value.height}
        loading="lazy"
        decoding="async"
      />
      {value.caption ? (
        <figcaption className="mt-1 text-sm text-muted-foreground">
          {value.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default ImageBlockObject;
