import { ImageIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { defineBlock } from "./defineBlock";
import { safeUrl } from "./safeUrl";

const MAX_SIDE = 4096;

const side = z.number().int().min(1).max(MAX_SIDE).optional();

const imageSchema = z.object({
  src: z.string().refine((src) => safeUrl(src, ["http", "https"])),
  alt: z.string().optional(),
  caption: z.string().optional(),
  width: side,
  height: side,
});

export type ImageValue = z.infer<typeof imageSchema>;

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
];

function ImageView({ value }: { value: ImageValue }) {
  return (
    <figure>
      {/*
        max-h-[70vh] + object-contain: with only `max-w-full`, a tall image
        rendered at full intrinsic height and dwarfed the rest of the feed.
        width/height are forwarded so the browser can reserve space and avoid
        layout shift while loading.
      */}
      <img
        className="max-w-full max-h-[70vh] w-auto h-auto rounded-md object-contain"
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

export const image = defineBlock<ImageValue>({
  name: "image",
  title: "Image",
  description: "A picture with optional alt text and caption.",
  icon: ImageIcon,
  category: "media",
  fields: imageFormFields,
  defaultValues: {},
  schema: imageSchema,
  View: ImageView,
  examples: [
    {
      src: "/welcon-bg.jpg",
      alt: "The Flookaa welcome background",
      caption: "A caption sits under the picture.",
    },
  ],
});
