import type { RenderStyleFunction } from "@portabletext/editor";

// A simple render function that maps the style name to an HTML tag
const renderStyle: RenderStyleFunction = (props: {
  schemaType: { value: string };
  children: React.ReactNode;
}) => {
  if (props.schemaType.value === "h1") {
    return <h1>{props.children}</h1>;
  }
  if (props.schemaType.value === "h2") {
    return <h2>{props.children}</h2>;
  }
  if (props.schemaType.value === "h3") {
    return <h3>{props.children}</h3>;
  }
  if (props.schemaType.value === "blockquote") {
    return <blockquote>{props.children}</blockquote>;
  }
  return <>{props.children}</>;
};

export default renderStyle;
