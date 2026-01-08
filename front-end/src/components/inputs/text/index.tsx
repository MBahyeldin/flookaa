import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "@/types/FormFields";
import { useState } from "react";

export default function TextInput({
  setFieldValue,
  handleBlur,
  error,
  touched,
  className,
  initValue,
  field,
}: FormFieldProps) {
  const [value, setValue] = useState(initValue || "");
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          {field.isRequired && <span className="text-destructive">*</span>}
        </Label>
      </div>
      <Input
        id={field.id}
        type={field.type}
        value={value}
        placeholder={field.placeholder}
        onChange={onChange}
        className="mt-2"
        onBlur={handleBlur}
      />
      {error && touched && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
