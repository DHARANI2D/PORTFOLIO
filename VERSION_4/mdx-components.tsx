import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/writing/callout";
import { CodeBlock, Pre } from "@/components/writing/code-block";
import { Diagram, Figure } from "@/components/writing/diagram";
import {
  Anchor,
  Blockquote,
  H1,
  H2,
  H3,
  Img,
  InlineCode,
  ListItem,
  OrderedList,
  Paragraph,
  Rule,
  Strong,
  Table,
  TableCell,
  TableHead,
  UnorderedList,
} from "@/components/writing/prose";

/**
 * The element map @next/mdx uses for every .mdx file (Next.js looks for this file at the project
 * root). Standard elements get documentation typography; Callout, CodeBlock, Diagram and Figure are
 * available in any note without an import.
 */
const components: MDXComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  p: Paragraph,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  a: Anchor,
  strong: Strong,
  blockquote: Blockquote,
  hr: Rule,
  code: InlineCode,
  pre: Pre,
  table: Table,
  th: TableHead,
  td: TableCell,
  img: Img,
  Callout,
  CodeBlock,
  Diagram,
  Figure,
};

export function useMDXComponents(overrides?: MDXComponents): MDXComponents {
  return { ...components, ...overrides };
}
