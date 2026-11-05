import type { FormField } from "@/models/Forms/FormField";
import TextInput from "../inputs/text";
import PicInput from "../inputs/pic";
import type { FormikErrors, FormikTouched } from "formik";
import TextareaInput from "../inputs/textarea";
import SelectInput from "../inputs/select";
import SwitchInput from "../inputs/switch";
import ListInput from "../inputs/list";
import VoiceInput from "../inputs/voice";
import InterestsInput from "../inputs/interests";

export default function FieldRender({
  field,
  error,
  touched,
  value,
  values,
  setFieldValue,
  handleBlur,
  setTouched,
}: {
  field: FormField;
  error?: string;
  touched?: boolean;
  value?: unknown;
  values?: Record<string, unknown>;
  touchedObject?: FormikTouched<Record<string, unknown>>;
  setFieldValue: (
    field: string,
    value: unknown,
    shouldValidate?: boolean | undefined
  ) => Promise<FormikErrors<Record<string, unknown>>> | Promise<void>;
  handleBlur?: (e: React.FocusEvent<unknown, Element>) => void;
  setTouched?: (
    touched: FormikTouched<Record<string, unknown>>,
    shouldValidate?: boolean
  ) => Promise<FormikErrors<Record<string, unknown>>> | Promise<void>;
}) {
  if (!field.interfaceType || !field.isVisible(values ?? {})) {
    return null;
  }
  return (
    // display: contents keeps the field a direct grid child; the form scrolls to it by data-field.
    <div data-field={field.id} className="contents">
      {["text", "password", "datetime"].includes(field.interfaceType) && (
        <TextInput
          field={field}
          error={error}
          touched={touched}
          initValue={value as string}
          setFieldValue={setFieldValue}
          handleBlur={handleBlur}
        />
      )}
      {field.interfaceType === "textarea" && (
        <TextareaInput
          error={error}
          setFieldValue={setFieldValue}
          field={field}
          initValue={value as string}
          handleBlur={handleBlur}
        />
      )}
      {/* Implement other field types similarly */}
      {field.interfaceType === "pic" && (
        <PicInput
          error={error}
          setFieldValue={setFieldValue}
          field={field}
          initValue={value as string}
          handleBlur={handleBlur}
          touched={touched}
          setTouched={setTouched}
          values={values}
        />
      )}
      {field.interfaceType === "voice" && (
        <VoiceInput
          error={error}
          setFieldValue={setFieldValue}
          field={field}
          initValue={value as string}
          touched={touched}
          values={values}
        />
      )}
      {field.interfaceType === "switch" && (
        <SwitchInput
          field={field}
          error={error}
          touched={touched}
          value={value}
          setFieldValue={setFieldValue}
        />
      )}
      {field.interfaceType === "interests" && (
        <InterestsInput
          field={field}
          error={error}
          touched={touched}
          value={value}
          setFieldValue={setFieldValue}
        />
      )}
      {field.interfaceType === "list" && (
        <ListInput field={field} value={value} setFieldValue={setFieldValue} />
      )}
      {
        field.interfaceType === "select" && (
          <SelectInput
            field={field}
            error={error}
            touched={touched}
            initValue={value as string}
            setFieldValue={setFieldValue}
            handleBlur={handleBlur}
          />
        )
      }
    </div>
  );
}
