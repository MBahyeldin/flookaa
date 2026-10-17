import type { ComponentType, ReactNode } from "react";
import type { ZodType } from "zod";
import type { FormField } from "@/models/Forms/FormField";

export type BlockCategory = "media" | "layout";

export const categoryTitle: Record<BlockCategory, string> = {
  media: "Media",
  layout: "Layout",
};

export type BlockEditorProps<T> = {
  value: T;
  selected: boolean;
  focused: boolean;
};

export type BlockDefinition<T> = {
  // The stored _type: permanent, never renamed.
  name: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  category: BlockCategory;
  fields: FormField[];
  defaultValues: Partial<T>;
  // Mirrors the server's checks in shared/util/portableText/block-objects.
  schema: ZodType<T>;
  View: (props: { value: T }) => ReactNode;
  Editor?: (props: BlockEditorProps<T>) => ReactNode;
  // For a block whose form edits a different shape than it stores.
  toForm?: (value: Partial<T>) => Record<string, unknown>;
  fromForm?: (form: Record<string, unknown>) => T;
  examples: T[];
};

export function defineBlock<T>(def: BlockDefinition<T>): BlockDefinition<T> {
  return def;
}
