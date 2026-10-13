import { Button } from "@/components/ui/button";
import type { FormField } from "@/models/Forms/FormField";
import FieldRender from "@/components/form/FieldRender";
import { useFormik } from "formik";

export function ObjectForm(
  props: {
    // Registry FormFields for blocks, toolbar fields for annotations.
    fields: ReadonlyArray<unknown>;
    defaultValues?: { [key: string]: unknown };
    submitLabel: string;
    onSubmit: ({ value }: { value: { [key: string]: unknown } }) => void;
  }
) {
  const { values, setFieldValue, handleSubmit } = useFormik({
    initialValues: {
      ...props.defaultValues,
    },
    onSubmit: (value) => {
      props.onSubmit({ value });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {(props.fields as any[])?.map((field: FormField) => (
        <FieldRender
          key={field.id}
          field={field}
          setFieldValue={setFieldValue}
          value={(values as Record<string, unknown>)[field.name!]}
          values={values}
        />
      ))}
      <Button className="self-end max-md:min-h-11" type="submit" size="sm">
        {props.submitLabel}
      </Button>
    </form>
  );
}
