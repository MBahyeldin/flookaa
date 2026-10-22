import type { PortableTextTextBlock } from "@portabletext/block-tools";
import { blockNames } from "@/components/portable-text/blocks";

export default function normalizeBlocks(blocks: PortableTextTextBlock[]): any[] {
  return blocks.map((block) => {
    const blockType = block._type;
    if (!blockType) {
      throw new Error("Block type is missing");
    }
    let markDefs = block.markDefs;
    if (markDefs) {
      markDefs = normalizeMarkDefs(block.markDefs || []);
    }
    if (blockType === "spoiler") {
      const content = (block as unknown as { content?: PortableTextTextBlock[] }).content ?? [];
      return { spoiler: { ...block, content: normalizeBlocks(content) } };
    }
    if (blockType === "block" || blockNames.includes(blockType)) {
      return {
        [blockType]: { ...block, [markDefs ? "markDefs" : ""]: markDefs },
      };
    }

    throw new Error(`Unsupported block type: ${blockType}`);
  });
}

function normalizeMarkDefs(markDefs: { _type: string }[]): any[] {
  return markDefs?.map((markDef) => {
    return {
      [markDef._type]: markDef,
    };
  });
}
