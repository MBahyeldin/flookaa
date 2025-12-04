import type { ToolbarBlockObjectSchemaType } from "@portabletext/toolbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";
import FieldRender from "@/components/form/FieldRender";
import type { FormField } from "@/models/Forms/FormField";
import { useFormik } from "formik";

export function InsertBlockObjectForm(
  props: Pick<ToolbarBlockObjectSchemaType, "fields" | "defaultValues"> & {
    onSubmit: ({
      value,
      placement,
    }: {
      value: { [key: string]: unknown };
      placement?: "auto" | "before" | "after";
    }) => void;
  }
) {
  const { setFieldValue, handleSubmit } = useFormik({
    initialValues: {
      placement: "auto",
      ...props.defaultValues,
    },
    onSubmit: (values) => {
      console.log("values", values);
      
      const { placement, ...value } = values;
      props.onSubmit({ value, placement });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
    
  };
  return (
    <form className="flex flex-col gap-2" onSubmit={onSubmit}>
      {props.fields?.map((field: FormField) => (
        <FieldRender
          key={field.id}
          field={field}
          setFieldValue={setFieldValue}
        />
      ))}
      <SelectField
        name="placement"
        label="Placement"
        defaultOption="auto"
        options={[
          { id: "auto", value: "auto", label: "Auto" },
          { id: "before", value: "before", label: "Before" },
          { id: "after", value: "after", label: "After" },
        ]}
      />
      <Button className="self-end" type="submit" size="sm">
        Insert
      </Button>
    </form>
  );
}

function SelectField(props: {
  name: string;
  label: string;
  options: { id: string; value: string; label: string }[];
  defaultOption?: string;
}) {
  const [value, setValue] = React.useState(props.defaultOption || "");
  React.useEffect(() => {
    setValue(props.defaultOption || "");
  }, [props.defaultOption]);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={props.name} className="text-sm font-medium">
        {props.label}
      </Label>
      <Select value={value} onValueChange={setValue} name={props.name}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={option.id} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
