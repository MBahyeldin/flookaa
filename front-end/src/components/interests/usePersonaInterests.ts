import { useCallback, useEffect, useState } from "react";
import { getPersonaInterests, setPersonaInterests } from "@/services/interests";
import type { PersonaInterests } from "@/types/interest";

export function usePersonaInterests(personaId: number | undefined) {
  const [data, setData] = useState<PersonaInterests | null>(null);
  const [value, setValue] = useState<number[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!personaId) return;
    let alive = true;
    setLoadError(false);
    getPersonaInterests(personaId).then((r) => {
      if (!alive) return;
      if (!r.ok) {
        setLoadError(true);
        return;
      }
      setData(r.data);
      setValue(r.data.selected);
    });
    return () => {
      alive = false;
    };
  }, [personaId]);

  const save = useCallback(async () => {
    if (!personaId) return { ok: false as const, error: "request_failed" };
    const r = await setPersonaInterests(personaId, value);
    if (r.ok) {
      setData(r.data);
      setValue(r.data.selected);
    }
    return r;
  }, [personaId, value]);

  const dirty =
    data !== null && (value.length !== data.selected.length || value.some((id) => !data.selected.includes(id)));

  return { data, value, setValue, save, dirty, loadError };
}
