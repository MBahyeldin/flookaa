import type { RenderBlockFunction } from "@portabletext/editor";

// Block objects
const renderBlock: RenderBlockFunction = (props: {
  value: unknown;
  schemaType: { name: string };
  children: React.JSX.Element;
}) => {
    
  if (props.schemaType.name === "image" && isImage(props.value)) {
    return props.children;
  }

  return <div style={{ marginBlockEnd: "0.25em" }} >{props.children}</div>;
};

function isImage(value: unknown): value is { src: string; alt?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "src" in value &&
    typeof (value as { src: unknown }).src === "string"
  );
}

export default renderBlock;
