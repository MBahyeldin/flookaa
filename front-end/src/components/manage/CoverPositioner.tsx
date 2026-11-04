import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Move } from "lucide-react";
import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export type CoverFocus = { x: number; y: number };

const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

// How far the photo overflows the band on each axis once it covers the band.
function overflow(band: DOMRect, natural: { width: number; height: number }) {
  const scale = Math.max(band.width / natural.width, band.height / natural.height);
  return { x: natural.width * scale - band.width, y: natural.height * scale - band.height };
}

export function CoverPositioner({
  src,
  focus,
  onChange,
}: {
  src: string;
  focus: CoverFocus;
  onChange: (focus: CoverFocus) => void;
}) {
  const band = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const drag = useRef<{ px: number; py: number; focus: CoverFocus; room: { x: number; y: number } } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setNatural(null);
    const img = new Image();
    img.onload = () => setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);

  const start = (e: PointerEvent<HTMLDivElement>) => {
    if (!natural || !band.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, focus, room: overflow(band.current.getBoundingClientRect(), natural) };
    setDragging(true);
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    onChange({
      x: d.room.x > 0 ? clamp(d.focus.x - ((e.clientX - d.px) / d.room.x) * 100) : d.focus.x,
      y: d.room.y > 0 ? clamp(d.focus.y - ((e.clientY - d.py) / d.room.y) * 100) : d.focus.y,
    });
  };

  const end = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!natural || !band.current) return;
    const step = e.shiftKey ? 10 : 2;
    const room = overflow(band.current.getBoundingClientRect(), natural);
    // Same direction as dragging: the photo moves with the arrow.
    const delta: Record<string, CoverFocus> = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    onChange({
      x: room.x > 0 ? clamp(focus.x + d.x) : focus.x,
      y: room.y > 0 ? clamp(focus.y + d.y) : focus.y,
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={band}
        role="slider"
        tabIndex={0}
        aria-label={t("common:coverPhoto.positionLabel")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={focus.y}
        aria-valuetext={`${focus.x}% ${focus.y}%`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKeyDown}
        className={cn(
          "relative aspect-[1192/280] w-full cursor-grab touch-none select-none overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging && "cursor-grabbing ring-2 ring-ring",
        )}
      >
        <Cover pattern="horizon" src={src} focus={focus} className="pointer-events-none" />
        {!dragging && (
          <span className="pointer-events-none absolute start-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs whitespace-nowrap text-card-foreground shadow-sm rtl:translate-x-1/2">
            <Move aria-hidden className="size-3.5" />
            {t("common:coverPhoto.drag")}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{t("common:coverPhoto.onPhone")}</span>
        <div className="aspect-[390/150] w-40 overflow-hidden rounded-lg bg-muted">
          <Cover pattern="horizon" src={src} focus={focus} className="pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
