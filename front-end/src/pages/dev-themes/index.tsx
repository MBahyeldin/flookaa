import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { FormField } from "@/components/ui/form-field";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { SectionHeader } from "@/components/ui/section-header";
import { SectionNav, SectionNavList, SectionNavTab } from "@/components/ui/section-nav";
import { SkeletonPost, SkeletonRow, Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Compass, Lock, Plus } from "lucide-react";
import PostContent from "@/components/portable-text/PostContent";
import { blocks } from "@/components/portable-text/blocks";
import { Post } from "@/components/post-card";
import type { Post as PostData } from "@/generated/graphql";
import { PALETTES, type PaletteId } from "@/themes/palettes";

function Components() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Delete</Button>
        <Button loading>Saving…</Button>
        <Button disabled>Disabled</Button>
        <Button size="icon" variant="outline" aria-label="Add">
          <Plus />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Add">
          <Plus />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip emoji="⚽">Sports</Chip>
        <Chip emoji="⚽" selected>Sports</Chip>
        <Chip kind="filter" onClick={() => {}}>All</Chip>
        <Chip kind="filter" selected onClick={() => {}}>Music</Chip>
        <Badge variant="secondary"><Lock />Private</Badge>
        <Badge variant="secondary">18+</Badge>
        <Badge variant="count">2</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Channel name" helper="Shown on the channel hero.">
          <Input defaultValue="Sunday League" />
        </FormField>
        <FormField label="Channel name" error="That name is taken.">
          <Input defaultValue="Sunday League" />
        </FormField>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
          <Avatar key={size} size={size}>
            <AvatarFallback>MS</AvatarFallback>
          </Avatar>
        ))}
        {(["sm", "md", "lg", "xl"] as const).map((size) => (
          <Logo key={size} size={size} name="Tech Builders" />
        ))}
      </div>
      <SectionHeader overline="Channels" title="In this community" seeAllTo="/dev/themes" />
      <SectionNav defaultValue="posts">
        <SectionNavList className="px-0">
          <SectionNavTab value="posts">Posts</SectionNavTab>
          <SectionNavTab value="about">About</SectionNavTab>
          <SectionNavTab value="people">People</SectionNavTab>
        </SectionNavList>
      </SectionNav>
      <Skeleton className="h-3 w-50" />
      <SkeletonPost />
      <SkeletonRow />
      <EmptyState
        icon={Compass}
        title="Your feed is quiet"
        body="Join a few channels and their posts will show up here."
        action={<Button>Discover channels</Button>}
      />
      <ErrorState title="Couldn't load posts" onRetry={() => {}} />
      <div className="rounded-lg border bg-card">
        <EmptyState compact icon={Compass} title="No pending requests" />
      </div>
    </div>
  );
}

const PAIRS: [label: string, fg: string, bg: string, bar: number][] = [
  ["foreground / background", "var(--foreground)", "var(--background)", 4.5],
  ["foreground / card", "var(--foreground)", "var(--card)", 4.5],
  ["foreground / popover", "var(--foreground)", "var(--popover)", 4.5],
  ["muted-fg / background", "var(--muted-foreground)", "var(--background)", 4.5],
  ["muted-fg / card", "var(--muted-foreground)", "var(--card)", 4.5],
  ["muted-fg / muted", "var(--muted-foreground)", "var(--muted)", 4.5],
  ["foreground / surface-sunken", "var(--foreground)", "var(--surface-sunken)", 4.5],
  ["muted-fg / surface-sunken", "var(--muted-foreground)", "var(--surface-sunken)", 4.5],
  ["primary-fg / primary", "var(--primary-foreground)", "var(--primary)", 4.5],
  ["secondary-fg / secondary", "var(--secondary-foreground)", "var(--secondary)", 4.5],
  ["accent-fg / accent", "var(--accent-foreground)", "var(--accent)", 4.5],
  ["primary / background", "var(--primary)", "var(--background)", 4.5],
  ["primary / card", "var(--primary)", "var(--card)", 4.5],
  ["primary / muted", "var(--primary)", "var(--muted)", 4.5],
  ["primary / surface-sunken", "var(--primary)", "var(--surface-sunken)", 4.5],
  ["success / muted", "var(--success)", "var(--muted)", 4.5],
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
  ["background / foreground", "var(--background)", "var(--foreground)", 4.5],
  ["primary / accent", "var(--primary)", "var(--accent)", 4.5],
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

const paragraph = (key: string, text: string) => ({
  block: { _type: "block", _key: key, style: "normal", markDefs: [], children: [{ _type: "span", _key: `${key}s`, text, marks: [] }] },
});

const example = (name: string, key: string) => {
  const value = blocks.find((block) => block.name === name)!.examples[0];
  const content = name === "spoiler" ? { content: value.content.map((block: unknown) => ({ block })) } : {};
  return { [name]: { _type: name, _key: key, ...value, ...content } };
};

const SAMPLE_PREVIEW = {
  _id: "sample",
  authorId: 0,
  author: { fullName: "Lina H.", profileImageUrl: null, anonymous: false },
  createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  rawContent: {
    blocks: [
      paragraph("p1", "Saturday's hike is on! We meet at the trailhead café at 8, walk the ridge loop, and come back for a long lunch. Everything you need is below."),
      example("image", "img"),
      paragraph("p2", "Here's the view from last time. The clock is ticking:"),
      example("countdown", "cd"),
      example("checklist", "cl"),
      example("voiceNote", "vn"),
      example("steps", "st"),
      example("spoiler", "sp"),
      example("quote", "qt"),
    ],
  },
  meta: { likesCount: 24, commentsCount: 8 },
  personalizedMeta: { likedByPersona: false },
} as unknown as PostData;

function PreviewSamples() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Post post={SAMPLE_PREVIEW} version="spine" channel={{ id: 0, name: "Weekend Hikers", theme: "forest" }} onOpen={() => {}} />
      <Post post={SAMPLE_PREVIEW} version="canvas" channel={{ id: 0, name: "Weekend Hikers", theme: "forest" }} onOpen={() => {}} />
    </div>
  );
}

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
            <div className="flex gap-2 text-xs">
              <span className="rounded border bg-surface-sunken px-2 py-1">surface-sunken</span>
              <span className="rounded bg-hero-overlay px-2 py-1 text-white">hero-overlay</span>
              <span className="rounded border bg-card px-2 py-1 shadow-sm">shadow-sm</span>
            </div>
            <Input placeholder="Input" />
            <Components />
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
      <PreviewSamples />
      <div className="grid gap-4 md:grid-cols-2">
        {PALETTES.flatMap(({ id, label }) => [
          <Swatch key={`${id}-light`} id={id} label={label} dark={false} />,
          <Swatch key={`${id}-dark`} id={id} label={label} dark />,
        ])}
      </div>
    </div>
  );
}
