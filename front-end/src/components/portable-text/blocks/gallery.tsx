import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon, ImagesIcon, XIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

const BENTO = 3;

function Tile({
  item,
  label,
  className,
  sizes,
  onOpen,
  children,
}: {
  item: GalleryItem;
  label: string;
  className?: string;
  sizes: number;
  onOpen: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onOpen}
      className={cn(
        "relative min-h-0 min-w-0 overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className
      )}
    >
      <img
        className="size-full object-cover"
        src={item.src}
        {...responsiveImage(item.src, item.width, sizes)}
        alt={item.alt ?? ""}
        loading="lazy"
        decoding="async"
      />
      {children}
    </button>
  );
}

function BentoView({ items, onOpen }: { items: GalleryItem[]; onOpen: (index: number) => void }) {
  const shown = items.slice(0, BENTO);
  const more = items.length - shown.length;
  const label = (i: number) => `Open image ${i + 1} of ${items.length}`;

  if (shown.length === 2) {
    return (
      <div className="grid aspect-[2/1] grid-cols-2 gap-1 overflow-hidden rounded-2xl">
        {shown.map((item, i) => (
          <Tile key={item._key} item={item} label={label(i)} sizes={0.5} onOpen={() => onOpen(i)} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid aspect-[3/2] grid-cols-2 grid-rows-[2fr_1fr] gap-1 overflow-hidden rounded-2xl sm:grid-cols-[2fr_1fr] sm:grid-rows-2">
      {shown.map((item, i) => (
        <Tile
          key={item._key}
          item={item}
          label={i === BENTO - 1 && more > 0 ? `${label(i)}, ${more} more` : label(i)}
          sizes={i === 0 ? 0.67 : 0.33}
          className={i === 0 ? "col-span-2 sm:col-span-1 sm:row-span-2" : undefined}
          onOpen={() => onOpen(i)}
        >
          {i === BENTO - 1 && more > 0 ? (
            <span
              aria-hidden
              className="absolute end-2 bottom-2 rounded-full bg-scrim/80 px-2.5 py-1 text-xs font-semibold text-background dark:text-foreground"
            >
              +{more}
            </span>
          ) : null}
        </Tile>
      ))}
    </div>
  );
}

function useStrip(count: number) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const isRtl = () => !!strip.current && getComputedStyle(strip.current).direction === "rtl";

  const slideWidth = () => {
    const first = strip.current?.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth : strip.current?.clientWidth ?? 0;
  };

  const go = (next: number, behavior: ScrollBehavior = "smooth") => {
    const el = strip.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(count - 1, next));
    el.scrollTo({ left: clamped * slideWidth() * (isRtl() ? -1 : 1), behavior });
  };

  // RTL scrollLeft runs negative, hence abs.
  const onScroll = () => {
    const width = slideWidth();
    if (!strip.current || width === 0) return;
    setIndex(Math.round(Math.abs(strip.current.scrollLeft) / width));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const forward = (e.key === "ArrowRight") !== isRtl();
    go(index + (forward ? 1 : -1));
  };

  return { strip, index, go, onScroll, onKeyDown };
}

function Dots({ count, index, onGo }: { count: number; index: number; onGo: (i: number) => void }) {
  return (
    <div className="mt-3 flex justify-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to image ${i + 1}`}
          aria-current={i === index ? "true" : undefined}
          onClick={() => onGo(i)}
          className="flex h-6 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        >
          <span className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-1.5 bg-border")} />
        </button>
      ))}
    </div>
  );
}

function CarouselView({ items, onOpen }: { items: GalleryItem[]; onOpen: (index: number) => void }) {
  const { strip, index, go, onScroll, onKeyDown } = useStrip(items.length);

  return (
    <div>
      <div
        ref={strip}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Gallery"
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
      >
        {items.map((item, i) => (
          <figure
            key={item._key}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${items.length}`}
            className="w-[72%] shrink-0 snap-start rounded-2xl border bg-card p-2 text-card-foreground sm:w-[60%]"
          >
            <button
              type="button"
              aria-label={`Open image ${i + 1} of ${items.length}`}
              onClick={() => onOpen(i)}
              className="block aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                className="size-full object-cover"
                src={item.src}
                {...responsiveImage(item.src, item.width, 0.72)}
                alt={item.alt ?? ""}
                loading={i === 0 ? undefined : "lazy"}
                decoding="async"
              />
            </button>
            {item.caption ? (
              <figcaption dir="auto" className="flex items-start gap-2 px-1 pt-2 pb-1 text-sm font-medium break-words">
                <ImageIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0 truncate" title={item.caption}>
                  {item.caption}
                </span>
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
      <Dots count={items.length} index={index} onGo={go} />
    </div>
  );
}

function GalleryViewer({
  items,
  start,
  onClose,
}: {
  items: GalleryItem[];
  start: number | null;
  onClose: () => void;
}) {
  const open = start !== null;
  const { strip, index, go, onScroll, onKeyDown } = useStrip(items.length);

  useEffect(() => {
    if (start === null) return;
    const frame = requestAnimationFrame(() => go(start, "instant"));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  const caption = items[index]?.caption;
  const navButton =
    "absolute top-1/2 hidden size-11 -translate-y-1/2 rounded-full bg-background/20 text-foreground hover:bg-background/40 md:inline-flex";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={onKeyDown}
        className="dark top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-scrim/95 p-0 text-foreground sm:max-w-none"
      >
        <DialogTitle className="sr-only">Gallery</DialogTitle>
        <DialogDescription className="sr-only">Use the arrow keys to move between images.</DialogDescription>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm tabular-nums">
            {index + 1} / {items.length}
          </span>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" className="text-foreground">
              <XIcon className="size-5" />
            </Button>
          </DialogClose>
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            ref={strip}
            onScroll={onScroll}
            className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
          >
            {items.map((item, i) => (
              <div
                key={item._key}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${items.length}`}
                className="flex size-full shrink-0 snap-start items-center justify-center p-2 md:px-16"
              >
                <img
                  className="max-h-full max-w-full object-contain"
                  src={item.src}
                  {...responsiveImage(item.src, item.width, 1)}
                  alt={item.alt ?? ""}
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
              className={cn(navButton, "start-4")}
              aria-label="Previous image"
              onClick={() => go(index - 1)}
            >
              <ChevronLeftIcon className="size-6 rtl:-scale-x-100" />
            </Button>
          ) : null}
          {index < items.length - 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(navButton, "end-4")}
              aria-label="Next image"
              onClick={() => go(index + 1)}
            >
              <ChevronRightIcon className="size-6 rtl:-scale-x-100" />
            </Button>
          ) : null}
        </div>
        <p dir="auto" className="min-h-14 px-4 py-4 text-center text-sm break-words">
          {caption}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function GalleryView({ value, compact = false }: { value: GalleryValue; compact?: boolean }) {
  const [viewing, setViewing] = useState<number | null>(null);
  return (
    <>
      {value.layout === "grid" || compact ? (
        <BentoView items={value.items} onOpen={setViewing} />
      ) : (
        <CarouselView items={value.items} onOpen={setViewing} />
      )}
      <GalleryViewer items={value.items} start={viewing} onClose={() => setViewing(null)} />
    </>
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
  summary: (value) => `Gallery · ${value.items.length}`,
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
