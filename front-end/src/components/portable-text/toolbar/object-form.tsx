import { Button } from "@/components/ui/button";
import type { ToolbarBlockObjectSchemaType } from "@portabletext/toolbar";
import type { FormField } from "@/models/Forms/FormField";
import FieldRender from "@/components/form/FieldRender";
import { useFormik } from "formik";

export function ObjectForm(
  props: Pick<ToolbarBlockObjectSchemaType, "fields" | "defaultValues"> & {
    submitLabel: string;
  } & {
    onSubmit: ({ value }: { value: { [key: string]: unknown } }) => void;
  }
) {
  const { setFieldValue, handleSubmit } = useFormik({
    initialValues: {
      ...props.defaultValues,
    },
    onSubmit: (values) => {

      const { ...value } = values;
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
          value={props.defaultValues ? props.defaultValues[field.name!] : null}
        />
      ))}
      <Button className="self-end" type="submit" size="sm">
        {props.submitLabel}
      </Button>
    </form>
  );
}
