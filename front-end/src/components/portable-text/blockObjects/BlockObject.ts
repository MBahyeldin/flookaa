import type { ReactNode } from "react";

export default class BlockObject<T> {
  name: string;
  title: string;
  icon?: ReactNode;
  renderBlock: (props: { value: T }) => React.ReactNode;
  fields?: Array<{
    name?: string;
    type?: string;
    options?: Record<string, unknown>[];
  }>;
  defaultValues: Partial<T> = {};

  constructor(params: {
    name: string;
    title: string;
    icon?: ReactNode;
    inputComponent?: (props: {
      value: T;
      onChange: (value: T) => void;
    }) => React.ReactNode;
    renderBlock: (props: { value: T }) => React.ReactNode;
    options?: Record<string, unknown>;
    fields?: Array<{
      name?: string;
      type?: string;
      options?: Record<string, unknown>[];
    }>;
  }) {
    this.name = params.name;
    this.title = params.title;
    this.fields = params.fields;
    this.renderBlock = params.renderBlock;
  }
}
