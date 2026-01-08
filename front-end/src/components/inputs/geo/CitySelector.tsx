import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { searchCitiesByStateId } from "@/services/geo";
import type { FormFieldProps } from "@/types/FormFields";
import { useEffect, useState } from "react";

type SearchCityProps = FormFieldProps & {
  stateId?: string;
};

type City = { id: string; name: string };

type CitiesByState = Record<string, City[]>;

export default function SearchCountry({
  setFieldValue,
  error,
  touched,
  className,
  initValue,
  field,
  stateId,
}: SearchCityProps) {
  const [value, setValue] = useState(String(initValue) || "");
  const [cities, setCities] = useState<CitiesByState>({});

  useEffect(() => {
    if (!stateId) {
      return;
    }
    if (cities[stateId]) {
      return;
    }
    const fetchStates = async () => {
      try {
        const data = await searchCitiesByStateId({
          stateId,
        });
        setCities(data);
        setCities((prev) => ({
          ...prev,
          [stateId]: data,
        }));
      } catch (error) {
        console.error("Error fetching states:", error);
      }
    };

    fetchStates();
  }, [stateId, cities]);

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

      <Select value={value} onValueChange={onChange} disabled={!stateId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Search..." />
        </SelectTrigger>
        <SelectContent>
          {stateId &&
            cities[stateId]?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {error && touched && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
