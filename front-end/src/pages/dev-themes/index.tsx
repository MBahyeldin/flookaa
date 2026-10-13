import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PostContent from "@/components/portable-text/PostContent";
import { PALETTES, type PaletteId } from "@/themes/palettes";

const GRADIENT_FROM = "oklch(0.40 calc(var(--gradient-c) * 1.115) var(--gradient-from-h))";
const GRADIENT_TO = "oklch(0.50 calc(var(--gradient-c) * 0.885) var(--gradient-to-h))";

const PAIRS: [label: string, fg: string, bg: string, bar: number][] = [
  ["foreground / background", "var(--foreground)", "var(--background)", 4.5],
  ["foreground / card", "var(--foreground)", "var(--card)", 4.5],
  ["foreground / popover", "var(--foreground)", "var(--popover)", 4.5],
  ["muted-fg / background", "var(--muted-foreground)", "var(--background)", 4.5],
  ["muted-fg / card", "var(--muted-foreground)", "var(--card)", 4.5],
  ["muted-fg / muted", "var(--muted-foreground)", "var(--muted)", 4.5],
  ["primary-fg / gradient from", "var(--primary-foreground)", GRADIENT_FROM, 4.5],
  ["primary-fg / gradient to", "var(--primary-foreground)", GRADIENT_TO, 4.5],
  ["secondary-fg / secondary", "var(--secondary-foreground)", "var(--secondary)", 4.5],
  ["accent-fg / accent", "var(--accent-foreground)", "var(--accent)", 4.5],
  ["primary / background", "var(--primary)", "var(--background)", 4.5],
  ["primary / card", "var(--primary)", "var(--card)", 4.5],
  ["success / background", "var(--success)", "var(--background)", 4.5],
  ["success / card", "var(--success)", "var(--card)", 4.5],
  ["warning / background", "var(--warning)", "var(--background)", 4.5],
  ["warning / card", "var(--warning)", "var(--card)", 4.5],
  ["destructive / background", "var(--destructive)", "var(--background)", 4.5],
  ["destructive / card", "var(--destructive)", "var(--card)", 4.5],
  ["success-fg / success", "var(--success-foreground)", "var(--success)", 4.5],
  ["warning-fg / warning", "var(--warning-foreground)", "var(--warning)", 4.5],
  ["destructive-fg / destructive", "var(--destructive-foreground)", "var(--destructive)", 4.5],
  ["ring / card", "var(--ring)", "var(--card)", 3],
];

const SAMPLE_POST = JSON.stringify({
  blocks: [
    { block: { _type: "block", _key: "h", style: "h3", markDefs: [], children: [{ _type: "span", _key: "h1", text: "A themed post", marks: [] }] } },
    {
      block: {
        _type: "block", _key: "p", style: "normal", markDefs: [],
        children: [
          { _type: "span", _key: "p1", text: "Body copy with ", marks: [] },
          { _type: "span", _key: "p2", text: "bold", marks: ["strong"] },
          { _type: "span", _key: "p3", text: " and plain text, rendered through PostContent.", marks: [] },
        ],
      },
    },
  ],
});

const canvas = typeof document === "undefined" ? null : document.createElement("canvas");

// Paints the computed colour on a 1×1 canvas to get sRGB, whatever the colour space.
function srgb(container: HTMLElement, color: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = color;
  container.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  canvas!.width = canvas!.height = 1;
  const ctx = canvas!.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Row = { label: string; ratio: number; bar: number };

function measure(el: HTMLElement): Row[] {
  return PAIRS.map(([label, fg, bg, bar]) => ({
    label,
    ratio: contrast(srgb(el, fg), srgb(el, bg)),
    bar,
  }));
}

function ContrastTable({ rows }: { rows: Row[] }) {
  const failing = rows.filter((row) => row.ratio < row.bar).length;

  return (
    <details open={failing > 0} className="text-xs">
      <summary className={failing ? "font-medium text-destructive" : "text-muted-foreground"}>
        {failing ? `${failing} pair${failing > 1 ? "s" : ""} below the bar` : `All ${rows.length} pairs pass`}
      </summary>
      <table className="mt-2 w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} data-failing={row.ratio < row.bar || undefined} className="data-failing:text-destructive">
              <td>{row.label}</td>
              <td className="text-right tabular-nums">{row.ratio.toFixed(2)}</td>
              <td className="pl-2 text-right tabular-nums text-muted-foreground">≥ {row.bar}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function Swatch({ id, label, dark }: { id: PaletteId; label: string; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useLayoutEffect(() => {
    if (ref.current) setRows(measure(ref.current));
  }, []);

  return (
    <div className={dark ? "dark" : undefined}>
      <div ref={ref} data-theme={id} className="space-y-3 rounded-xl border bg-background p-4 text-foreground">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base">{label}</h3>
          <code className="text-xs text-muted-foreground">{id} · {dark ? "dark" : "light"}</code>
        </div>
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle>Card title</CardTitle>
            <p className="text-sm text-muted-foreground">Muted text, timestamps, counters</p>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <PostContent rawContent={SAMPLE_POST} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="secondary">Secondary</Button>
              <Button size="sm" variant="outline">Outline</Button>
              <Button size="sm" variant="destructive">Delete</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge>Badge</Badge>
              <span className="text-primary">Primary link</span>
              <span className="text-success">Success</span>
              <span className="text-warning">Warning</span>
              <span className="text-destructive">Error</span>
            </div>
            <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
              Tinted success box
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded bg-success px-2 py-1 text-success-foreground">success</span>
              <span className="rounded bg-warning px-2 py-1 text-warning-foreground">warning</span>
              <span className="rounded bg-destructive px-2 py-1 text-destructive-foreground">destructive</span>
              <span className="rounded bg-accent px-2 py-1 text-accent-foreground">accent</span>
            </div>
            <Input placeholder="Input" />
          </CardContent>
        </Card>
        <ContrastTable rows={rows} />
      </div>
    </div>
  );
}

export default function DevThemesPage() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1>Theme palettes</h1>
        <p className="text-sm text-muted-foreground">
          Every palette in light and dark. Light swatches are only accurate while the app itself is in light mode.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {PALETTES.flatMap(({ id, label }) => [
          <Swatch key={`${id}-light`} id={id} label={label} dark={false} />,
          <Swatch key={`${id}-dark`} id={id} label={label} dark />,
        ])}
      </div>
    </div>
  );
}
