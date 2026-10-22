import { blockByName, type AnyBlock } from "./blocks";

export type InvalidBlock = {
  index: number;
  key?: string;
  block: AnyBlock;
  issues: string[];
};

export function blockIssues(block: AnyBlock, value: unknown): string[] {
  const result = block.schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) =>
    issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message
  );
}

export function validateBlocks(value: { _type?: string; _key?: string }[]): InvalidBlock[] {
  const invalid: InvalidBlock[] = [];
  value.forEach((item, index) => {
    const block = item._type ? blockByName(item._type) : undefined;
    if (!block) return;
    const issues = blockIssues(block, item);
    if (issues.length) invalid.push({ index, key: item._key, block, issues });
  });
  return invalid;
}
