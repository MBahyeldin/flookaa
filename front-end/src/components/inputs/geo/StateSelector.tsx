import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getStatesByCountryID } from "@/services/geo";
import type { FormFieldProps } from "@/types/FormFields";
import { useEffect, useState } from "react";

type StateSelectorProps = FormFieldProps & {
  countryId?: string;
};

export default function StateSelector({
  setFieldValue,
  error,
  touched,
  className,
  initValue,
  field,
  countryId,
}: StateSelectorProps) {
  const [value, setValue] = useState(String(initValue) || "");
  const [states, setStates] = useState<
    Record<string, { id: string; name: string }[]>
  >({});

  useEffect(() => {
    if (!countryId) {
      return;
    }
    if (states[countryId]) {
      return;
    }
    const fetchStates = async () => {
      try {
        const data = await getStatesByCountryID(countryId);
        setStates((prev) => ({ ...prev, [countryId]: data }));
      } catch (error) {
        console.error("Error fetching states:", error);
      }
    };

    fetchStates();
  }, [countryId, states]);

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
      <div className="flex items-center gap-2 mb-2">
        {field.icon}
        <Label htmlFor={field.id}>{field.label}</Label>
      </div>
      <Select value={value} onValueChange={onChange} disabled={!countryId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={field.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {countryId &&
            states[countryId]?.map((c) => (
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
