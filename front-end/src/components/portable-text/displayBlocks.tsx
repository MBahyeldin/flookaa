import type { PortableTextComponents } from "@portabletext/react";

/**
 * Block renderers for *displaying* portable text (feeds, comments).
 *
 * Author-supplied headings are demoted: a post styled `h1` renders as an
 * `<h3>` so user content can't introduce a second `<h1>` and take over the
 * page outline. Sizes are set explicitly here so demoting the tag doesn't
 * also shrink the visual emphasis the author intended.
 */
const displayBlockComponents: PortableTextComponents = {
  block: {
    h1: ({ children }) => (
      <h3 className="text-2xl font-bold mt-4 mb-2">{children}</h3>
    ),
    h2: ({ children }) => (
      <h4 className="text-xl font-semibold mt-4 mb-2">{children}</h4>
    ),
    h3: ({ children }) => (
      <h5 className="text-lg font-semibold mt-3 mb-2">{children}</h5>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground my-3">
        {children}
      </blockquote>
    ),
    normal: ({ children }) => <p className="leading-relaxed">{children}</p>,
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 space-y-1 my-2">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 space-y-1 my-2">{children}</ol>
    ),
  },
};

export default displayBlockComponents;
