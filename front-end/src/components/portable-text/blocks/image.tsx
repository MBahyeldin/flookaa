import type { CSSProperties } from "react";
import { ImageIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { perLanguage, t } from "@/i18n";
import { httpLink } from "./validation";
import { defineBlock } from "./defineBlock";
import { safeUrl } from "./safeUrl";
import { responsiveImage } from "./responsiveImage";
import { cn } from "@/lib/utils";

const MAX_SIDE = 4096;

const side = z.number().int().min(1).max(MAX_SIDE).optional();

const sizes = ["xs", "s", "m", "l", "xl"] as const;
const aligns = ["left", "center", "right"] as const;

const imageSchema = z.object({
  src: z.string().refine((src) => safeUrl(src, ["http", "https"]), httpLink),
  alt: z.string().optional(),
  caption: z.string().optional(),
  width: side,
  height: side,
  size: z.enum(sizes).optional(),
  align: z.enum(aligns).optional(),
});

export type ImageValue = z.infer<typeof imageSchema>;

const imageFormFields = perLanguage((): FormField[] => [
  new FormField({
    id: "src",
    name: "src",
    label: t("blocks:image.fields.imageUrl"),
    type: "string",
    interfaceType: "pic",
    placeholder: t("blocks:image.fields.httpsExampleComJpg"),
    isRequired: true,
    width: "full",
    dimensions: { width: "width", height: "height" },
  }),
  new FormField({
    id: "alt",
    name: "alt",
    label: t("blocks:image.fields.altText"),
    type: "string",
    interfaceType: "text",
    placeholder: t("blocks:image.fields.aDescriptionOfTheImage"),
    isRequired: false,
    width: "full",
  }),
  new FormField({
    id: "caption",
    name: "caption",
    label: t("blocks:image.fields.caption"),
    type: "string",
    interfaceType: "text",
    placeholder: t("blocks:image.fields.captionForTheImageOptional"),
    isRequired: false,
    width: "full",
  }),
  new FormField({
    id: "size",
    name: "size",
    label: t("blocks:image.fields.displaySize"),
    type: "string",
    interfaceType: "select",
    options: [
      { label: t("blocks:image.fields.extraSmall25"), value: "xs" },
      { label: t("blocks:image.fields.small40"), value: "s" },
      { label: t("blocks:image.fields.medium60"), value: "m" },
      { label: t("blocks:image.fields.large80"), value: "l" },
      { label: t("blocks:image.fields.fullWidth100"), value: "xl" },
    ],
    width: "full",
  }),
  new FormField({
    id: "align",
    name: "align",
    label: t("blocks:image.fields.alignment"),
    type: "string",
    interfaceType: "select",
    options: [
      { label: t("blocks:image.fields.left"), value: "left" },
      { label: t("blocks:image.fields.centre"), value: "center" },
      { label: t("blocks:image.fields.right"), value: "right" },
    ],
    width: "full",
    visibleWhen: (values) => (values.size ?? "xl") !== "xl",
  }),
  new FormField({ id: "width", name: "width", label: t("blocks:image.fields.width"), type: "number" }),
  new FormField({ id: "height", name: "height", label: t("blocks:image.fields.height"), type: "number" }),
]);

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

function ImageView({ value, compact = false }: { value: ImageValue; compact?: boolean }) {
  const { width, height } = value;
  const known = width !== undefined && height !== undefined;
  // Caps live on the figure so the caption always matches the drawn image:
  // never wider than the file, never taller than 70vh (360px when compact).
  const cap = compact ? "360px" : "70vh";
  const style: CSSProperties | undefined = known
    ? { maxWidth: `min(${width}px, calc(${cap} * ${width} / ${height}))` }
    : undefined;

  return (
    <figure
      className={cn(
        known ? sizeClass[value.size ?? "xl"] : "w-fit max-w-full",
        alignClass[value.align ?? "center"],
        "rounded-2xl border bg-card p-2 text-card-foreground"
      )}
      style={style}
    >
      <img
        className={cn(
          "block rounded-xl",
          known ? "w-full h-auto" : cn("max-w-full w-auto h-auto", compact ? "max-h-[360px]" : "max-h-[70vh]")
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
        <figcaption dir="auto" className="flex items-start gap-2 px-1 pt-2 pb-1 text-sm font-medium break-words">
          <ImageIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span className="min-w-0">{value.caption}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}

export const image = defineBlock<ImageValue>({
  name: "image",
  get title() {
    return t("blocks:image.title");
  },
  get description() {
    return t("blocks:image.description");
  },
  icon: ImageIcon,
  category: "media",
  get fields() {
    return imageFormFields();
  },
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
