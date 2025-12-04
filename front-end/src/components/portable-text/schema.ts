// import { defineSchema } from "@portabletext/editor";
// import type BlockObject from "./blockObjects/BlockObject";
// import type { AllBlockObjectsValuesType } from "./blockObjects/BlockObjectsProvider";
// import type { BlockObjectSchemaType } from "@portabletext/editor";
// import { Link } from "lucide-react";

// export const buildSchemaDefinition = ({
//   blockObjects,
// }: {
//   blockObjects: BlockObject<AllBlockObjectsValuesType>[];
// }) =>
//   defineSchema({
//     // Decorators are simple marks that don't hold any data
//     // they are applied to inline text
//     decorators: [{ name: "strong" }, { name: "em" }, { name: "underline" }],
//     // Styles apply to entire text blocks
//     // block is group of text that share the same style
//     // There's always a 'normal' style that can be considered the paragraph style
//     styles: [
//       { name: "normal" },
//       { name: "h1" },
//       { name: "h2" },
//       { name: "h3" },
//       { name: "blockquote" },
//     ],

//     // The types below are left empty for this example.
//     // See the rendering guide to learn more about each type.

//     // Annotations are more complex marks that can hold data (for example, hyperlinks).
//     annotations: [
//       { name: "link", fields: [{ name: "href", type: "url" }], icon: Link },
//     ],
//     // Lists apply to entire text blocks as well (for example, bullet, numbered).
//     lists: [],
//     // Inline objects hold arbitrary data that can be inserted into the text (for example, custom emoji).
//     inlineObjects: [],
//     // Block objects hold arbitrary data that live side-by-side with text blocks (for example, images, code blocks, and tables).
// blockObjects: blockObjects as BlockObjectSchemaType[],
//   });

// export default buildSchemaDefinition;

import { type BlockObjectSchemaType, defineSchema } from "@portabletext/editor";

import { z } from "zod";

export const playgroundSchemaDefinition = (
  blockObjects: BlockObjectSchemaType[]
) => {
  console.log("blockObjects in schema", blockObjects);

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
        fields: [{ name: "href", title: "HREF", type: "string" }],
      },
      {
        title: "Comment",
        name: "comment",
        fields: [{ name: "text", title: "Text", type: "string" }],
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
    blockObjects: [
      {
        title: "Break",
        name: "break",
      },
      // {
      //   title: "Image",
      //   name: "image",
      //   fields: [
      //     { name: "src", title: "Src", type: "string" },
      //     { name: "alt", title: "Alt text", type: "string" },
      //   ],
      // },
      ...blockObjects,
      // Overriding the image block to add default values
      // for easier testing
    ],
    inlineObjects: [
      {
        title: "Stock ticker",
        name: "stock-ticker",
        fields: [{ name: "symbol", title: "Symbol", type: "string" }],
      },
      {
        title: "Inline image",
        name: "image",
        fields: [
          { name: "src", title: "Src", type: "string" },
          { name: "alt", title: "Alt text", type: "string" },
        ],
      },
    ],
  });
};

export const InlineImageSchema = z.object({
  schemaType: z.object({
    name: z.literal("image"),
  }),
  value: z.object({
    src: z.string(),
    alt: z.string().optional(),
  }),
});

export const CommentAnnotationSchema = z.object({
  schemaType: z.object({
    name: z.literal("comment"),
  }),
  value: z.object({
    text: z.string(),
  }),
});

export const LinkAnnotationSchema = z.object({
  schemaType: z.object({
    name: z.literal("link"),
  }),
  value: z.object({
    href: z.string(),
  }),
});

export const StockTickerSchema = z.object({
  schemaType: z.object({
    name: z.literal("stock-ticker"),
  }),
  value: z.object({
    symbol: z.string(),
  }),
});
