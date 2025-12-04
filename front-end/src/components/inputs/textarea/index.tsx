import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "@/types/FormFields";
import { useState } from "react";

export default function TextareaInput({
  setFieldValue,
  error,
  touched,
  className,
  initValue,
  field,
}: FormFieldProps) {
  const [value, setValue] = useState(initValue || "");
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setFieldValue(
      field.id,
      e.target.value,
      field.isRequired || field.validate !== undefined
    );
  };
  return (
    <div className={cn(className, field.width)}>
      <div className="flex items-center gap-2">
        {field.icon}
        <Label htmlFor={field.id}>
          {" "}
          {field.label}{" "}
          {field.isRequired && <span className="text-red-500">*</span>}
        </Label>
      </div>
      <Textarea
        id={field.id}
        value={value}
        placeholder={field.placeholder}
        onChange={onChange}
        className="mt-2"
      />
      {error && touched && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
