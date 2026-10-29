import { useCallback, useEffect, useState } from "react";
import { listInterests } from "@/services/interests";
import type { Interest, InterestGroup } from "@/types/interest";

export function useInterestGroups() {
  const [groups, setGroups] = useState<InterestGroup[] | "error" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    listInterests().then((r) => {
      if (alive) setGroups(r.ok ? r.data : "error");
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setGroups(null);
    setAttempt((a) => a + 1);
  }, []);

  const pick = useCallback(
    (ids: number[]): Interest[] => {
      if (!Array.isArray(groups)) return [];
      const byId = new Map(groups.flatMap((g) => g.interests).map((i) => [i.id, i]));
      return ids.flatMap((id) => byId.get(id) ?? []);
    },
    [groups],
  );

  return { groups, retry, pick };
}
