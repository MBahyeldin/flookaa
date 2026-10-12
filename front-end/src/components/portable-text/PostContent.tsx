import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { useMemo } from "react";
import deNormalizeBlocks from "@/utils/deNormalizeBlocks";
import displayBlockComponents from "./displayBlocks";
import { blocks } from "./blocks";

const components: PortableTextComponents = {
  ...displayBlockComponents,
  types: Object.fromEntries(
    blocks.map((block) => [
      block.name,
      ({ value }: { value: unknown }) => {
        if (!block.schema.safeParse(value).success) {
          console.warn(`Skipping invalid ${block.name} block`, value);
          return null;
        }
        return <block.View value={value} />;
      },
    ])
  ),
};

function parse(rawContent: unknown) {
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
}: {
  rawContent: unknown;
  theme?: string;
}) {
  const value = useMemo(() => parse(rawContent), [rawContent]);

  return (
    <div className="post-content space-y-4" data-theme={theme}>
      <PortableText value={value} components={components} />
    </div>
  );
}
