import type { RenderDecoratorFunction } from "@portabletext/editor";

const renderDecorator: RenderDecoratorFunction = (props: {
  schemaType: { value: string };
  children: React.ReactNode;
}) => {
    console.log("renderDecorator", props);

  if (props.schemaType.value === "strong") {
    return <strong>{props.children}</strong>;
  }
  if (props.schemaType.value === "em") {
    return <em>{props.children}</em>;
  }
  if (props.schemaType.value === "underline") {
    return <u>{props.children}</u>;
  }
  return <>{props.children}</>;
};

export default renderDecorator;
