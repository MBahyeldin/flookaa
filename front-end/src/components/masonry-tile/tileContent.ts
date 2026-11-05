import type { PortableTextBlock } from "@portabletext/react";
import { parsePostContent } from "@/components/portable-text/PostContent";
import { blockByName, blockSummary } from "@/components/portable-text/blocks";
import { blockIssues } from "@/components/portable-text/validateBlocks";

type TileImage = { src: string; alt?: string; caption?: string; width?: number; height?: number };

export type TileContent = { image?: TileImage; line: string; excerpt: string };

const textOf = (block: PortableTextBlock) =>
  (Array.isArray(block.children) ? block.children : [])
    .map((child) => (typeof child?.text === "string" ? child.text : ""))
    .join("");

function validBlock(block: PortableTextBlock) {
  const def = blockByName(block._type);
  return def && blockIssues(def, block).length === 0 ? def : undefined;
}

function leadImage(block: PortableTextBlock | undefined): TileImage | undefined {
  if (!block || !validBlock(block)) return undefined;
  if (block._type === "image") return block as unknown as TileImage;
  if (block._type === "gallery") return (block as unknown as { items: TileImage[] }).items[0];
  return undefined;
}

/** What a masonry tile shows: a lead image, the first line, and the text after it. */
export function tileContent(rawContent: unknown): TileContent {
  const value = parsePostContent(rawContent);
  const texts = value
    .filter((block) => block._type === "block")
    .map(textOf)
    .map((text) => text.trim())
    .filter(Boolean);
  const [first = "", ...rest] = texts;
  const [line = "", ...more] = first.split("\n");
  const excerpt = [more.join(" "), ...rest].join(" ").replace(/\s+/g, " ").trim();

  const image = leadImage(value[0]);
  if (image) return { image, line: line.trim() || image.caption?.trim() || "", excerpt: "" };

  let fallback = "";
  if (!line) {
    for (const block of value) {
      const def = block._type === "block" ? undefined : validBlock(block);
      if (def) {
        fallback = blockSummary(def, block);
        break;
      }
    }
  }
  return { line: line.trim() || fallback, excerpt };
}
