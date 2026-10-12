import type { ToolbarBlockObjectSchemaType } from "@portabletext/toolbar";
import { Button } from "@/components/ui/button";
import React from "react";
import FieldRender from "@/components/form/FieldRender";
import type { FormField } from "@/models/Forms/FormField";
import { useFormik } from "formik";

export function InsertBlockObjectForm(
  props: Pick<ToolbarBlockObjectSchemaType, "fields" | "defaultValues"> & {
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
    <form className="flex flex-col gap-2" onSubmit={onSubmit}>
      {(props.fields as any[])?.map((field: FormField) => (
        <FieldRender
          key={field.id}
          field={field}
          setFieldValue={setFieldValue}
          value={(values as Record<string, unknown>)[field.name!]}
          values={values}
        />
      ))}
      <Button className="self-end" type="submit" size="sm">
        Insert
      </Button>
    </form>
  );
}
