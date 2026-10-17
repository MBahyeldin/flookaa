import { useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import type { PortableTextBlock } from "@portabletext/react";
import PostContent from "@/components/portable-text/PostContent";
import { blocks, type AnyBlock } from "@/components/portable-text/blocks";
import { categoryTitle, type BlockCategory } from "@/components/portable-text/blocks/defineBlock";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_PALETTE, PALETTES, isPaletteId, type PaletteId } from "@/themes/palettes";

function groupByCategory(list: AnyBlock[]) {
  const groups = new Map<BlockCategory, AnyBlock[]>();
  for (const block of list) {
    groups.set(block.category, [...(groups.get(block.category) ?? []), block]);
  }
  return [...groups];
}

function exampleValue(block: AnyBlock, example: unknown, index: number) {
  return [
    { _type: block.name, _key: `${block.name}-${index}`, ...(example as object) },
  ] as PortableTextBlock[];
}

function BlockSection({ block, theme }: { block: AnyBlock; theme: PaletteId }) {
  const examples = useMemo(
    () => block.examples.map((example, index) => exampleValue(block, example, index)),
    [block],
  );

  return (
    <section id={block.name} className="flex scroll-mt-32 flex-col gap-3 md:scroll-mt-20">
      <div className="flex items-start gap-3">
        <block.icon className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium">{block.title}</h3>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              /{block.name}
            </code>
          </div>
          <p className="text-sm text-muted-foreground">{block.description}</p>
        </div>
      </div>
      {examples.map((value, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4 text-card-foreground">
          <PostContent value={value} theme={theme} showInvalid />
        </div>
      ))}
    </section>
  );
}

export default function BlocksGalleryPage() {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const requested = params.get("theme");
  const theme = isPaletteId(requested) ? requested : DEFAULT_PALETTE;
  const groups = useMemo(() => groupByCategory(blocks), []);

  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);

  const setTheme = (next: string) => {
    setParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (next === DEFAULT_PALETTE) updated.delete("theme");
        else updated.set("theme", next);
        return updated;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-12 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Blocks</h1>
          <p className="text-sm text-muted-foreground">
            Everything you can add to a post. Insert one with "+" or by typing its slash command.
          </p>
        </div>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-40" aria-label="Palette">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PALETTES.map((palette) => (
              <SelectItem key={palette.id} value={palette.id}>
                {palette.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <nav
        aria-label="Blocks"
        className="sticky top-14 z-30 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:top-0"
      >
        <ul className="flex w-max gap-2">
          {blocks.map((block) => (
            <li key={block.name}>
              <a
                href={`#${block.name}`}
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm whitespace-nowrap hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <block.icon className="size-4 text-primary" />
                {block.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map(([category, list]) => (
        <div key={category} className="flex flex-col gap-8">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {categoryTitle[category]}
          </h2>
          {list.map((block) => (
            <BlockSection key={block.name} block={block} theme={theme} />
          ))}
        </div>
      ))}
    </div>
  );
}
