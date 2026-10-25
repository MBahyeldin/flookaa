import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/** The picked interest slugs, kept as repeated `?interest=` params. */
export function useInterestParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const interests = searchParams.getAll("interest");
  const setInterests = useCallback(
    (slugs: string[], extra?: (next: URLSearchParams) => void) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("interest");
          for (const slug of slugs) next.append("interest", slug);
          extra?.(next);
          return next;
        },
        { replace: true }
      ),
    [setSearchParams]
  );
  return { interests, setInterests, searchParams };
}

/** "Football", "Football and Fitness", "Football, Fitness and 2 more". */
export function interestNamesLabel(names: string[]) {
  if (names.length <= 2) return names.join(" and ");
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}
