import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ImagesIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { defineBlock } from "./defineBlock";
import { safeUrl } from "./safeUrl";
import { responsiveImage } from "./responsiveImage";

const MIN_ITEMS = 2;
const MAX_ITEMS = 20;
const MAX_SIDE = 4096;
const MAX_CAPTION = 120;
const MAX_ALT = 300;

const layouts = ["carousel", "grid"] as const;

const side = z.number().int().min(1).max(MAX_SIDE).optional();

const gallerySchema = z.object({
  layout: z.enum(layouts).optional(),
  items: z
    .array(
      z.object({
        _key: z.string().min(1, "is required"),
        src: z.string().refine((src) => safeUrl(src, ["http", "https"]), "must be an http(s) link"),
        alt: z.string().max(MAX_ALT).optional(),
        caption: z
          .string()
          .refine((caption) => caption.length <= MAX_CAPTION, `must be at most ${MAX_CAPTION} characters`)
          .refine((caption) => !/[\r\n]/.test(caption), "must be one line")
          .optional(),
        width: side,
        height: side,
      })
    )
    .min(MIN_ITEMS, `at least ${MIN_ITEMS} images are required`)
    .max(MAX_ITEMS)
    .refine(
      (items) => new Set(items.map((item) => item._key)).size === items.length,
      "image keys must be unique"
    ),
});

type GalleryValue = z.infer<typeof gallerySchema>;
type GalleryItem = GalleryValue["items"][number];

const galleryFormFields: FormField[] = [
  new FormField({
    id: "layout",
    name: "layout",
    label: "Layout",
    type: "string",
    interfaceType: "select",
    options: [
      { label: "Carousel", value: "carousel" },
      { label: "Grid", value: "grid" },
    ],
    width: "full",
  }),
  new FormField({
    id: "items",
    name: "items",
    label: "Images",
    type: "array",
    interfaceType: "list",
    itemLabel: "Image",
    addLabel: "Add image",
    minItems: MIN_ITEMS,
    maxItems: MAX_ITEMS,
    itemFields: [
      new FormField({
        id: "src",
        name: "src",
        label: "Image",
        type: "string",
        interfaceType: "pic",
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
      }),
      new FormField({
        id: "caption",
        name: "caption",
        label: "Caption",
        type: "string",
        interfaceType: "text",
        placeholder: "Caption for the image (optional)",
      }),
    ],
  }),
];

function GridView({ items }: { items: GalleryItem[] }) {
  return (
    <ul className={cn("grid gap-2", items.length >= 5 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
      {items.map((item) => (
        <li key={item._key} className="min-w-0">
          <figure>
            <img
              className="block aspect-square w-full rounded-md bg-muted object-contain"
              src={item.src}
              {...responsiveImage(item.src, item.width, 0.5)}
              alt={item.alt ?? ""}
              loading="lazy"
              decoding="async"
            />
            {item.caption ? (
              <figcaption
                dir="auto"
                title={item.caption}
                className="mt-1 w-fit mx-auto truncate text-xs text-muted-foreground"
              >
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}

function CarouselView({ items }: { items: GalleryItem[] }) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const isRtl = () => !!strip.current && getComputedStyle(strip.current).direction === "rtl";

  const go = (next: number) => {
    const el = strip.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(items.length - 1, next));
    el.scrollTo({ left: clamped * el.clientWidth * (isRtl() ? -1 : 1), behavior: "smooth" });
  };

  // RTL scrollLeft runs negative, hence abs.
  const onScroll = () => {
    const el = strip.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const forward = (e.key === "ArrowRight") !== isRtl();
    go(index + (forward ? 1 : -1));
  };

  const caption = items[index]?.caption;
  const navButton =
    "absolute top-1/2 hidden size-9 -translate-y-1/2 rounded-full bg-background/80 text-foreground shadow-sm hover:bg-background [@media(hover:hover)]:inline-flex";

  return (
    <figure>
      <div className="relative">
        <div
          ref={strip}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Gallery"
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-md [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {items.map((item, i) => (
            <div
              key={item._key}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}`}
              className="aspect-[4/3] w-full shrink-0 snap-start bg-muted"
            >
              <img
                className="size-full object-contain"
                src={item.src}
                {...responsiveImage(item.src, item.width, 1)}
                alt={item.alt ?? ""}
                loading={i === 0 ? undefined : "lazy"}
                decoding="async"
              />
            </div>
          ))}
        </div>
        {index > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(navButton, "start-2")}
            aria-label="Previous image"
            onClick={() => go(index - 1)}
          >
            <ChevronLeftIcon className="size-5 rtl:-scale-x-100" />
          </Button>
        ) : null}
        {index < items.length - 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(navButton, "end-2")}
            aria-label="Next image"
            onClick={() => go(index + 1)}
          >
            <ChevronRightIcon className="size-5 rtl:-scale-x-100" />
          </Button>
        ) : null}
        <span
          aria-hidden
          className="absolute top-2 end-2 rounded-full bg-background/80 px-2 py-0.5 text-xs text-foreground tabular-nums"
        >
          {index + 1} / {items.length}
        </span>
      </div>
      {caption ? (
        <figcaption dir="auto" className="mt-1 text-center text-sm text-muted-foreground break-words">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function GalleryView({ value }: { value: GalleryValue }) {
  return value.layout === "carousel" ? (
    <CarouselView items={value.items} />
  ) : (
    <GridView items={value.items} />
  );
}

const sample = (key: string, caption?: string): GalleryItem => ({
  _key: key,
  src: "/welcon-bg.jpg",
  alt: "The Flookaa welcome background",
  width: 4096,
  height: 2214,
  caption,
});

export const gallery = defineBlock<GalleryValue>({
  name: "gallery",
  title: "Gallery",
  description: "Several pictures as a grid or a carousel.",
  icon: ImagesIcon,
  category: "media",
  fields: galleryFormFields,
  defaultValues: { layout: "carousel" },
  schema: gallerySchema,
  View: GalleryView,
  examples: [
    {
      layout: "carousel",
      items: [sample("c1", "The first slide"), sample("c2"), sample("c3", "صورة بعنوان عربي")],
    },
    {
      layout: "grid",
      items: [
        sample("a1", "Morning"),
        sample("a2", "Noon"),
        sample("a3", "Evening"),
        sample("a4", "A much longer caption that gets cut short in the grid"),
      ],
    },
    {
      layout: "grid",
      items: ["b1", "b2", "b3", "b4", "b5", "b6"].map((key) => sample(key)),
    },
  ],
});
