import type { PortableTextComponents } from "@portabletext/react";

/**
 * Block renderers for *displaying* portable text (feeds, comments).
 *
 * Author-supplied headings are demoted: a post styled `h1` renders as an
 * `<h3>` so user content can't introduce a second `<h1>` and take over the
 * page outline. Sizes are set explicitly here so demoting the tag doesn't
 * also shrink the visual emphasis the author intended.
 */
// dir="auto" on every text block: each line takes its direction from its own
// text, as in the editor, so Arabic lines with English words keep their order.
const displayBlockComponents: PortableTextComponents = {
  block: {
    h1: ({ children }) => (
      <h3 dir="auto" className="text-2xl font-bold mt-4 mb-2">
        {children}
      </h3>
    ),
    h2: ({ children }) => (
      <h4 dir="auto" className="text-xl font-semibold mt-4 mb-2">
        {children}
      </h4>
    ),
    h3: ({ children }) => (
      <h5 dir="auto" className="text-lg font-semibold mt-3 mb-2">
        {children}
      </h5>
    ),
    h4: ({ children }) => <h4 dir="auto">{children}</h4>,
    h5: ({ children }) => <h5 dir="auto">{children}</h5>,
    h6: ({ children }) => <h6 dir="auto">{children}</h6>,
    blockquote: ({ children }) => (
      <blockquote
        dir="auto"
        className="border-s-2 border-border ps-4 italic text-muted-foreground my-3"
      >
        {children}
      </blockquote>
    ),
    normal: ({ children }) => (
      <p dir="auto" className="leading-relaxed">
        {children}
      </p>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul dir="auto" className="list-disc ps-6 space-y-1 my-2">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol dir="auto" className="list-decimal ps-6 space-y-1 my-2">
        {children}
      </ol>
    ),
  },
  listItem: ({ children }) => <li dir="auto">{children}</li>,
};

export default displayBlockComponents;
