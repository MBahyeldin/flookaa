import { type BlockObjectSchemaType, defineSchema } from "@portabletext/editor";

import { z } from "zod";

export const playgroundSchemaDefinition = (
  blockObjects: BlockObjectSchemaType[]
) => {

  return defineSchema({
    decorators: [
      {
        title: "Strong",
        name: "strong",
      },
      {
        title: "Emphasis",
        name: "em",
      },
      {
        title: "Code",
        name: "code",
      },
      {
        title: "Underline",
        name: "underline",
      },
      {
        title: "Strike",
        name: "strike-through",
      },
      {
        title: "Subscript",
        name: "subscript",
      },
      {
        title: "Superscript",
        name: "superscript",
      },
    ],
    annotations: [
      {
        title: "Link",
        name: "link",
        fields: [{ name: "href", title: "URL", type: "string" }],
      },
    ],
    lists: [
      {
        title: "Bulleted list",
        name: "bullet",
      },
      {
        title: "Numbered list",
        name: "number",
      },
    ],
    styles: [
      {
        title: "Normal",
        name: "normal",
      },
      {
        title: "Heading 1",
        name: "h1",
      },
      {
        title: "Heading 2",
        name: "h2",
      },
      {
        title: "Heading 3",
        name: "h3",
      },
      {
        title: "Heading 4",
        name: "h4",
      },
      {
        title: "Heading 5",
        name: "h5",
      },
      {
        title: "Heading 6",
        name: "h6",
      },
      {
        title: "Quote",
        name: "blockquote",
      },
    ],
    blockObjects,
    inlineObjects: [],
  });
};

export const LinkAnnotationSchema = z.object({
  schemaType: z.object({
    name: z.literal("link"),
  }),
  value: z.object({
    href: z.string(),
  }),
});
