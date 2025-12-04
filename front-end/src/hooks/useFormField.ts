import type { FormField } from "@/models/Forms/FormField";
import { useEffect, useState } from "react";

export default function useFormField(field: FormField) {
  const [error, setError] = useState<string | undefined>(field.error);
  const [touched, setTouched] = useState(field.touched);

  useEffect(() => {
    setError(field.error);
  }, [field.error]);

  useEffect(() => {
    setTouched(field.touched);
  }, [field.touched]);

  return { error, touched };
}
