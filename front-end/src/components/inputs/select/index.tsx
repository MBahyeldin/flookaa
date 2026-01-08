import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "@/types/FormFields";
import { useState } from "react";

export default function SelectInput({
  setFieldValue,
  error,
  touched,
  className,
  initValue,
  field,
}: FormFieldProps) {
  const [value, setValue] = useState(initValue || "");
  const onChange = (value: string) => {
    setValue(value);
    setFieldValue(
      field.id,
      value,
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
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-full mt-2">
          <SelectValue placeholder={field.placeholder || "Select an option"} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option, index) => (
            <SelectItem
              key={index}
              value={option.value as string}
              className="cursor-pointer"
            >
              {option.label as string}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && touched && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
