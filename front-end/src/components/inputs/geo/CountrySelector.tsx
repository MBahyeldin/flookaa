import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getCountries } from "@/services/geo";
import type { FormFieldProps } from "@/types/FormFields";
import { useEffect, useState } from "react";

export default function DropdownCountry({
  setFieldValue,
  error,
  touched,
  className,
  initValue,
  field,
}: FormFieldProps) {
  const [value, setValue] = useState(String(initValue) || "");
  const [countries, setCountries] = useState<{ id: string; name: string }[]>(
    []
  );

  useEffect(() => {
    // Fetch countries from the JSON file
    const fetchCountries = async () => {
      try {
        const data = await getCountries();
        setCountries(data);
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };

    fetchCountries();
  }, []);

  const onChange = (newValue: string) => {
    setValue(newValue);
    setFieldValue(
      field.id,
      newValue,
      field.isRequired || field.validate !== undefined
    );
  };
  return (
    <div className={cn(className, field.width)}>
      <div className="flex items-center gap-2 mb-2">
        {field.icon}
        <Label htmlFor={field.id}>{field.label}</Label>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={field.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {countries.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && touched && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
