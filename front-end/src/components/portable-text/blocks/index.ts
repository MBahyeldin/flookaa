import type { BlockDefinition } from "./defineBlock";
import { image } from "./image";
import { breakBlock } from "./break";
import { callout } from "./callout";
import { quote } from "./quote";
import { steps } from "./steps";
import { accordion } from "./accordion";

export type AnyBlock = BlockDefinition<any>;

export const blocks: AnyBlock[] = [image, breakBlock, callout, quote, steps, accordion];

const byName = new Map(blocks.map((block) => [block.name, block]));

export function blockByName(name: string): AnyBlock | undefined {
  return byName.get(name);
}

export const blockNames = blocks.map((block) => block.name);
