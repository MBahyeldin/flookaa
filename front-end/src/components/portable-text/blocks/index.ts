import type { BlockDefinition } from "./defineBlock";
import { image } from "./image";
import { breakBlock } from "./break";
import { callout } from "./callout";
import { quote } from "./quote";
import { steps } from "./steps";
import { accordion } from "./accordion";
import { spoiler } from "./spoiler";
import { countdown } from "./countdown";
import { checklist } from "./checklist";
import { voiceNote } from "./voiceNote";

export type AnyBlock = BlockDefinition<any>;

export const blocks: AnyBlock[] = [image, voiceNote, breakBlock, callout, quote, steps, accordion, spoiler, countdown, checklist];

const byName = new Map(blocks.map((block) => [block.name, block]));

export function blockByName(name: string): AnyBlock | undefined {
  return byName.get(name);
}

export const blockNames = blocks.map((block) => block.name);

export function toFormValue(block: AnyBlock | undefined, value: Record<string, unknown>) {
  return block?.toForm ? block.toForm(value) : value;
}

export function fromFormValue(block: AnyBlock | undefined, form: Record<string, unknown>) {
  return block?.fromForm ? block.fromForm(form) : form;
}
