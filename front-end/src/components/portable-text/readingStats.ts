import type { PortableTextBlock } from "@portabletext/react";

const ARTICLE_MIN_CHARS = 1200;
const WORDS_PER_MINUTE = 200;

export function readingStats(value: PortableTextBlock[]) {
  const text = value
    .flatMap((block) => (Array.isArray(block.children) ? block.children : []))
    .map((child) => (typeof child?.text === "string" ? child.text : ""))
    .join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    isArticle: text.length > ARTICLE_MIN_CHARS,
    minutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
  };
}
