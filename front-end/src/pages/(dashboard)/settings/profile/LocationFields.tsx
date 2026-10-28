import { useEffect, useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCountries, getStatesByCountryID, searchCitiesByStateId } from "@/services/geo";

type Place = { id: number | string; name: string };
export type Location = { country_id: string; state_id: string; city_id: string };

function usePlaces(load: (() => Promise<Place[]>) | null, key: string) {
  const [places, setPlaces] = useState<Place[]>([]);
  useEffect(() => {
    setPlaces([]);
    if (!load) return;
    let alive = true;
    load()
      .then((list) => alive && setPlaces(list ?? []))
      .catch(() => alive && setPlaces([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return places;
}

function PlaceSelect({
  label,
  value,
  places,
  disabled,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  places: Place[];
  disabled?: boolean;
  placeholder: string;
  onChange: (id: string) => void;
}) {
  // The stored id shows only once its list has loaded, so the trigger never shows a bare number.
  const known = places.some((p) => String(p.id) === value);
  return (
    <Select value={known ? value : ""} onValueChange={(id) => id && onChange(id)} disabled={disabled}>
      <FormField label={label}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormField>
      <SelectContent>
        {places.map((p) => (
          <SelectItem key={p.id} value={String(p.id)}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LocationFields({ value, onChange }: { value: Location; onChange: (next: Location) => void }) {
  const countries = usePlaces(getCountries, "countries");
  const states = usePlaces(value.country_id ? () => getStatesByCountryID(value.country_id) : null, value.country_id);
  const cities = usePlaces(
    value.state_id ? () => searchCitiesByStateId({ stateId: value.state_id }) : null,
    value.state_id,
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <PlaceSelect
        label="Country"
        placeholder="Choose a country"
        value={value.country_id}
        places={countries}
        onChange={(country_id) => onChange({ country_id, state_id: "", city_id: "" })}
      />
      <PlaceSelect
        label="State / province"
        placeholder="Choose a state"
        value={value.state_id}
        places={states}
        disabled={!value.country_id}
        onChange={(state_id) => onChange({ ...value, state_id, city_id: "" })}
      />
      <PlaceSelect
        label="City"
        placeholder="Choose a city"
        value={value.city_id}
        places={cities}
        disabled={!value.state_id}
        onChange={(city_id) => onChange({ ...value, city_id })}
      />
    </div>
  );
}
