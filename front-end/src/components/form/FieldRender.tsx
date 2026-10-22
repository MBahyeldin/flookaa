import type { FormField } from "@/models/Forms/FormField";
import TextInput from "../inputs/text";
import PicInput from "../inputs/pic";
import type { FormikErrors, FormikTouched } from "formik";
import ProfilePictureInput from "../inputs/profile-picture";
import TextareaInput from "../inputs/textarea";
import CountrySelector from "../inputs/geo/CountrySelector";
import StateSelector from "../inputs/geo/StateSelector";
import CitySelector from "../inputs/geo/CitySelector";
import SelectInput from "../inputs/select";
import SwitchInput from "../inputs/switch";
import ListInput from "../inputs/list";
import VoiceInput from "../inputs/voice";
import ThemeInput from "../inputs/theme";
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
      {/* Profile Picture Input */}
      {field.interfaceType === "profile-picture" && (
        <ProfilePictureInput
          error={error}
          setFieldValue={setFieldValue}
          field={field}
          initValue={value as string}
          handleBlur={handleBlur}
          first_name={values?.first_name as string}
          last_name={values?.last_name as string}
          email={values?.email_address as string}
          touched={touched}
          setTouched={setTouched}
        />
      )}
      {/* Country Dropdown */}
      {field.interfaceType === "dropdown-country" && (
        <CountrySelector
          field={field}
          error={error}
          touched={touched}
          initValue={value as string}
          setFieldValue={setFieldValue}
          handleBlur={handleBlur}
        />
      )}
      {/* State Selector */}
      {field.interfaceType === "dropdown-state" && (
        <StateSelector
          field={field}
          error={error}
          touched={touched}
          initValue={value as string}
          setFieldValue={setFieldValue}
          countryId={values?.country_id as string}
          handleBlur={handleBlur}
        />
      )}
      {/* Implement other field types like radio, checkbox, date, file, etc. */}
      {field.interfaceType === "dropdown-city" && (
        <CitySelector
          field={field}
          error={error}
          touched={touched}
          initValue={value as string}
          setFieldValue={setFieldValue}
          stateId={values?.state_id as string}
          handleBlur={handleBlur}
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
      {field.interfaceType === "theme" && (
        <ThemeInput
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
