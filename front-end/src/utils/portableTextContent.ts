import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from "@portabletext/block-tools";

type Blocks = PortableTextTextBlock<PortableTextSpan | PortableTextObject>[];

/**
 * Portable Text shape, for reference:
 *
 *   [{ _type: "block", children: [{ _type: "span", text: "hi" }, …] },
 *    { _type: "image", … }]                      // a block object, no text
 *
 * An "empty" editor is not an empty array — it still holds one block with a
 * single zero-length span. Counting `blocks.length` therefore reports 1 for
 * both an empty editor and a full paragraph, which is why the composer's
 * counter showed "1/280" for 17 characters and why Post stayed enabled after
 * clearing the field.
 */

/** Total number of characters across every text span. */
export function portableTextLength(blocks: Blocks | undefined): number {
  if (!blocks?.length) return 0;

  return blocks.reduce((total, block) => {
    // Block objects (images, breaks) carry no text of their own.
    if (block._type !== "block") return total;

    const children = (block.children ?? []) as { text?: unknown }[];
    return (
      total +
      children.reduce(
        (sum, child) => sum + (typeof child.text === "string" ? child.text.length : 0),
        0
      )
    );
  }, 0);
}

/**
 * Whether the editor holds anything worth submitting.
 *
 * Text counts, and so does any non-text block — an image-only post is valid
 * content even though `portableTextLength` returns 0 for it.
 */
export function portableTextIsEmpty(blocks: Blocks | undefined): boolean {
  if (!blocks?.length) return true;
  if (blocks.some((block) => block._type !== "block")) return false;
  return portableTextLength(blocks) === 0;
}
