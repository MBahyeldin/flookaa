import type { RenderBlockFunction } from "@portabletext/editor";
import type { ReactNode } from "react";

// Block objects
const renderBlock: RenderBlockFunction = (props: {
  name: string;
  value: unknown;
  schemaType: { name: string };
  children: ReactNode;
}) => {
    console.log("renderBlock", props);
    
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
