/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PortableTextTextBlock } from "@portabletext/block-tools";

export default function deNormalizeBlocks(
  blocks: any[],
  types: string[]
): PortableTextTextBlock[] {
  return blocks.map((block) => {
    const blockType = Object.keys(block)[0];
    if (!blockType) {
      return;      
      throw new Error("Block type is missing");
    }

    if (block[blockType].markDefs) {
      block[blockType].markDefs = deNormalizeMarkDefs(
        block[blockType].markDefs
      );
    }

    if (blockType === "block") {
      return block.block;
    }

    if (types.includes(blockType)) {
      return block[blockType];
    }

    throw new Error(`Unsupported block type: ${blockType}`);
  });
}

function deNormalizeMarkDefs(markDefs: any[]): { _type: string }[] {
  return markDefs?.map((markDef) => {
    return markDef[Object.keys(markDef)[0]];
  });
}
