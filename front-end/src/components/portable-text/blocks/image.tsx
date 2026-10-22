import type { CSSProperties } from "react";
import { ImageIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { defineBlock } from "./defineBlock";
import { safeUrl } from "./safeUrl";
import { responsiveImage } from "./responsiveImage";
import { cn } from "@/lib/utils";

const MAX_SIDE = 4096;

const side = z.number().int().min(1).max(MAX_SIDE).optional();

const sizes = ["xs", "s", "m", "l", "xl"] as const;
const aligns = ["left", "center", "right"] as const;

const imageSchema = z.object({
  src: z.string().refine((src) => safeUrl(src, ["http", "https"]), "must be an http(s) link"),
  alt: z.string().optional(),
  caption: z.string().optional(),
  width: side,
  height: side,
  size: z.enum(sizes).optional(),
  align: z.enum(aligns).optional(),
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
    dimensions: { width: "width", height: "height" },
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
    id: "size",
    name: "size",
    label: "Display size",
    type: "string",
    interfaceType: "select",
    options: [
      { label: "Extra small (25%)", value: "xs" },
      { label: "Small (40%)", value: "s" },
      { label: "Medium (60%)", value: "m" },
      { label: "Large (80%)", value: "l" },
      { label: "Full width (100%)", value: "xl" },
    ],
    width: "full",
  }),
  new FormField({
    id: "align",
    name: "align",
    label: "Alignment",
    type: "string",
    interfaceType: "select",
    options: [
      { label: "Left", value: "left" },
      { label: "Centre", value: "center" },
      { label: "Right", value: "right" },
    ],
    width: "full",
    visibleWhen: (values) => (values.size ?? "xl") !== "xl",
  }),
  new FormField({ id: "width", name: "width", label: "Width", type: "number" }),
  new FormField({ id: "height", name: "height", label: "Height", type: "number" }),
];

const sizeClass: Record<(typeof sizes)[number], string> = {
  xs: "w-1/4",
  s: "w-2/5",
  m: "w-3/5",
  l: "w-4/5",
  xl: "w-full",
};

const sizeFraction: Record<(typeof sizes)[number], number> = {
  xs: 0.25,
  s: 0.4,
  m: 0.6,
  l: 0.8,
  xl: 1,
};

const alignClass: Record<(typeof aligns)[number], string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

function ImageView({ value }: { value: ImageValue }) {
  const { width, height } = value;
  const known = width !== undefined && height !== undefined;
  // Caps live on the figure so the caption always matches the drawn image:
  // never wider than the file, never taller than 70vh.
  const style: CSSProperties | undefined = known
    ? { maxWidth: `min(${width}px, calc(70vh * ${width} / ${height}))` }
    : undefined;

  return (
    <figure
      className={cn(
        known ? sizeClass[value.size ?? "xl"] : "w-fit max-w-full",
        alignClass[value.align ?? "center"]
      )}
      style={style}
    >
      <img
        className={cn(
          "block rounded-md",
          known ? "w-full h-auto" : "max-w-full max-h-[70vh] w-auto h-auto"
        )}
        src={value.src}
        {...responsiveImage(value.src, width, sizeFraction[value.size ?? "xl"])}
        alt={value.alt ?? ""}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
      {value.caption ? (
        <figcaption dir="auto" className="mt-1 text-center text-sm text-muted-foreground break-words">
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
  defaultValues: { size: "xl", align: "center" },
  schema: imageSchema,
  View: ImageView,
  examples: [
    {
      src: "/welcon-bg.jpg",
      alt: "The Flookaa welcome background",
      width: 4096,
      height: 2214,
      caption: "A caption sits under the picture.",
      size: "m",
      align: "center",
    },
    {
      src: "/welcon-bg.jpg",
      alt: "The Flookaa welcome background",
      width: 4096,
      height: 2214,
      caption: "A smaller picture on the right.",
      size: "s",
      align: "right",
    },
    {
      src: "/welcon-bg.jpg",
      alt: "The Flookaa welcome background",
      width: 4096,
      height: 2214,
      size: "xl",
    },
  ],
});
