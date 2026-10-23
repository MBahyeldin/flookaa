import { PortableText, type PortableTextBlock, type PortableTextComponents } from "@portabletext/react";
import { useMemo } from "react";
import deNormalizeBlocks from "@/utils/deNormalizeBlocks";
import displayBlockComponents from "./displayBlocks";
import { blocks, type AnyBlock } from "./blocks";
import { blockIssues } from "./validateBlocks";
import PreviewStream, { type PreviewOptions } from "./PreviewStream";

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

function buildComponents({ showInvalid = false, preview = false, compact = false } = {}): PortableTextComponents {
  return {
    ...displayBlockComponents,
    block: preview
      ? {
          ...(displayBlockComponents.block as object),
          normal: ({ children }) => (
            <p dir="auto" data-clamp className="line-clamp-4 leading-relaxed">
              {children}
            </p>
          ),
        }
      : displayBlockComponents.block,
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
          return <block.View value={value} compact={compact} />;
        },
      ])
    ),
  };
}

const feedComponents = buildComponents();
const previewComponents = buildComponents({ showInvalid: true });
const streamComponents = buildComponents({ preview: true });
const compactStreamComponents = buildComponents({ preview: true, compact: true });

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
  value: parsed,
  theme,
  showInvalid = false,
  preview,
}: {
  rawContent?: unknown;
  value?: PortableTextBlock[];
  theme?: string;
  showInvalid?: boolean;
  preview?: PreviewOptions;
}) {
  const value = useMemo(() => parsed ?? parsePostContent(rawContent), [parsed, rawContent]);

  return (
    <div className="post-content space-y-4" data-theme={theme}>
      {preview ? (
        <PreviewStream
          value={value}
          components={streamComponents}
          compactComponents={compactStreamComponents}
          options={preview}
        />
      ) : (
        <PortableText value={value} components={showInvalid ? previewComponents : feedComponents} />
      )}
    </div>
  );
}
