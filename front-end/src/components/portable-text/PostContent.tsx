import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { useMemo } from "react";
import deNormalizeBlocks from "@/utils/deNormalizeBlocks";
import displayBlockComponents from "./displayBlocks";
import { blocks, type AnyBlock } from "./blocks";
import { blockIssues } from "./validateBlocks";

function InvalidBlockNotice({ block, issues }: { block: AnyBlock; issues: string[] }) {
  return (
    <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
      <div className="flex items-center gap-2 font-medium">
        <block.icon className="size-4" />
        {block.title} needs fixing
      </div>
      <ul className="mt-1 list-disc pl-6">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}

function buildComponents(showInvalid: boolean): PortableTextComponents {
  return {
    ...displayBlockComponents,
    types: Object.fromEntries(
      blocks.map((block) => [
        block.name,
        ({ value }: { value: unknown }) => {
          const issues = blockIssues(block, value);
          if (issues.length) {
            if (showInvalid) return <InvalidBlockNotice block={block} issues={issues} />;
            console.warn(`Skipping invalid ${block.name} block`, value);
            return null;
          }
          return <block.View value={value} />;
        },
      ])
    ),
  };
}

const feedComponents = buildComponents(false);
const previewComponents = buildComponents(true);

export function parsePostContent(rawContent: unknown) {
  try {
    const doc = typeof rawContent === "string" ? JSON.parse(rawContent || "{}") : rawContent;
    return deNormalizeBlocks(doc?.blocks ?? []);
  } catch (error) {
    console.warn("Skipping unreadable post content", error);
    return [];
  }
}

export default function PostContent({
  rawContent,
  theme,
  showInvalid = false,
}: {
  rawContent: unknown;
  theme?: string;
  showInvalid?: boolean;
}) {
  const value = useMemo(() => parsePostContent(rawContent), [rawContent]);

  return (
    <div className="post-content space-y-4" data-theme={theme}>
      <PortableText
        value={value}
        components={showInvalid ? previewComponents : feedComponents}
      />
    </div>
  );
}
