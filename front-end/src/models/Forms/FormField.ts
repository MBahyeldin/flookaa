import type { FormFieldInterfaceTypes } from "@/types/FormFields";
import type React from "react";

export class FormField {
  public id: string;
  public label: string;
  public type: string;
  public interfaceType?: FormFieldInterfaceTypes;
  public placeholder?: string;
  public error?: string;
  public touched: boolean;
  public isRequired?: boolean;
  public options?: Record<string, unknown>[];
  public width?: string;
  public height?: string;
  public icon?: React.ReactNode;
  public value?: string;
  public name?: string;
  public validate?: (
    value?: unknown,
    values?: Record<string, unknown>
  ) => string | null;
  public visibleWhen?: (values: Record<string, unknown>) => boolean;
  // Pic fields only: the sibling fields that receive the picked file's size.
  public dimensions?: { width: string; height: string };

  constructor({
    id,
    label,
    type,
    placeholder,
    interfaceType,
    error,
    isRequired = false,
    touched = false,
    width = "full",
    height,
    options,
    icon,
    value,
    name,
    validate = () => null,
    visibleWhen,
    dimensions,
  }: {
    id: string;
    label: string;
    type: string;
    placeholder?: string;
    interfaceType?: FormFieldInterfaceTypes;
    value?: string;
    error?: string;
    touched?: boolean;
    isRequired?: boolean;
    width?: "1/4" | "1/3" | "1/2" | "3/4" | "2/3" | "full";
    height?: string;
    options?: Record<string, unknown>[];
    icon?: React.ReactNode;
    name?: string;
    validate?: (
      value?: unknown,
      values?: Record<string, unknown>
    ) => string | null;
    visibleWhen?: (values: Record<string, unknown>) => boolean;
    dimensions?: { width: string; height: string };
  }) {
    this.id = id;
    this.label = label;
    this.type = type;
    this.placeholder = placeholder;
    this.error = error;
    this.touched = touched;
    this.interfaceType = interfaceType;
    this.isRequired = isRequired;
    this.height = height;
    this.options = options;
    this.icon = icon;
    this.value = value;
    this.name = name;
    this.width = this.geWidthClass(width);
    this.validate = validate;
    this.visibleWhen = visibleWhen;
    this.dimensions = dimensions;
  }

  isVisible(values: Record<string, unknown>) {
    return this.visibleWhen ? this.visibleWhen(values) : true;
  }

  geWidthClass(width: string) {
    switch (width) {
      case "1/4":
        return "col-span-12 md:col-span-6 lg:col-span-4";
      case "1/3":
        return "col-span-12 md:col-span-4";
      case "1/2":
        return "col-span-12 md:col-span-6";
      case "3/4":
        return "col-span-12 md:col-span-9";
      case "2/3":
        return "col-span-12 md:col-span-8";
      case "full":
      default:
        return "col-span-12";
    }
  }
}
