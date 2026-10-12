import type { PortableTextTextBlock } from "@portabletext/block-tools";
import { blockNames } from "@/components/portable-text/blocks";

// Unwraps the GraphQL envelope ({ image: {...} }). Blocks this bundle doesn't know are dropped.
export default function deNormalizeBlocks(blocks: any[]): PortableTextTextBlock[] {
  const result: PortableTextTextBlock[] = [];
  for (const envelope of blocks ?? []) {
    const blockType = envelope ? Object.keys(envelope)[0] : undefined;
    const block = blockType ? envelope[blockType] : undefined;
    if (!blockType || !block || (blockType !== "block" && !blockNames.includes(blockType))) {
      console.warn(`Skipping unknown block type: ${blockType}`);
      continue;
    }
    result.push(
      block.markDefs
        ? { ...block, markDefs: deNormalizeMarkDefs(block.markDefs) }
        : block
    );
  }
  return result;
}

function deNormalizeMarkDefs(markDefs: any[]): { _type: string }[] {
  return markDefs?.map((markDef) => {
    return markDef[Object.keys(markDef)[0]];
  });
}
