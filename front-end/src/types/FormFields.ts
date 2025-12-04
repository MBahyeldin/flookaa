import type { FormField } from "@/models/Forms/FormField";
import type { FormikErrors, FormikTouched } from "formik";

type FormFieldInterfaceTypes =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "file"
  | "pic"
  | "profile-picture"
  | "dropdown-country"
  | "dropdown-state"
  | "dropdown-city";

export type { FormFieldInterfaceTypes };

export type SetFieldValue = (
  field: string,
  value: Record<string, unknown> | string | number | boolean,
  shouldValidate?: boolean | undefined
) => Promise<void> | Promise<FormikErrors<Record<string, unknown>>>;

export type SetFieldValueEvent =
  | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  | {
      target: {
        value: string | number | boolean | Record<string, unknown>;
      };
    };

export type FormFieldProps = {
  setFieldValue: (
    field: string,
    value: unknown,
    shouldValidate?: boolean | undefined
  ) => Promise<FormikErrors<Record<string, unknown>>> | Promise<void>;
  handleBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  setTouched?: (
    touched: FormikTouched<Record<string, unknown>>,
    shouldValidate?: boolean
  ) => Promise<FormikErrors<Record<string, unknown>>> | Promise<void>;
  error: string | undefined;
  touched?: boolean;
  className?: string;
  initValue?: string;
  field: FormField;
  name?: string;
  type?: string;
  value?: unknown;
};

export type FormGroup = {
  id: string;
  label: string;
  description?: string;
  sort?: number;
  fields: FormField[];
  displayInCard?: {
    header: React.ReactElement;
    footer?: React.ReactElement;
  };
};
