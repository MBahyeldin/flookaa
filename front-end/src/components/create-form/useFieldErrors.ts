import { useCallback, useState } from "react";

export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clear = useCallback(
    (field: string) =>
      setErrors((prev) => {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }),
    [],
  );
  return { errors, setErrors, clear };
}
