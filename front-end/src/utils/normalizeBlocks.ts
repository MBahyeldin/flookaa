/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PortableTextTextBlock } from "@portabletext/block-tools";

export default function normalizeBlocks(
  blocks: PortableTextTextBlock[],
  types: string[]
): any[] {
  console.log("blocks", blocks);

  return blocks.map((block) => {
    const blockType = block._type;
    if (!blockType) {
      throw new Error("Block type is missing");
    }
    let markDefs = block.markDefs;
    if (markDefs) {
      markDefs = normalizeMarkDefs(block.markDefs || []);
    }
    if (blockType === "block") {
      return {
        [blockType]: { ...block, [markDefs ? "markDefs" : ""]: markDefs },
      };
    }
    if (types.includes(blockType)) {
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
