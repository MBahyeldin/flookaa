import { useAppStore, type AppState } from "@/stores/AppStore";
import type { OperationVariables } from "@apollo/client";
import type { useLazyQuery } from "@apollo/client/react";
import { useState, useCallback, useMemo } from "react";

export default function useCustomInfiniteQuery<
  U,
  T extends OperationVariables,
  R,
>({
  queryFn,
  storeSelector,
  updateStoreWithData,
  normalizeData,
  optionVariables,
  limit,
  initialOffset,
}: {
  queryFn: useLazyQuery.ExecFunction<U, T>;
  storeSelector: (state: AppState) => string[];
  updateStoreWithData: (data?: U) => void;
  normalizeData: (data: string[]) => R;
  optionVariables: useLazyQuery.ExecOptions<T>;
  limit: number;
  initialOffset: number;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [offset, setOffset] = useState(initialOffset || 0);

  const selector = useAppStore(storeSelector);

  const result = useMemo(() => {
    return normalizeData(selector);
  }, [selector, normalizeData]);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const { data, error } = await queryFn({
        ...optionVariables,
        variables: {
          ...optionVariables.variables,
          limit,
          offset,
        },
      });
      if (error) throw error;
      setOffset((prev) => prev + limit);
      updateStoreWithData(data);
      setIsLoading(false);
    } catch (e) {
      // A newer call aborted this one and reports its own result.
      if ((e as Error)?.name === "AbortError") return;
      // The offset stays, so the next try asks for the same page.
      setError(true);
      setIsLoading(false);
    }
  }, [queryFn, optionVariables, limit, offset, updateStoreWithData]);

  return {
    isLoading,
    error,
    result,
    loadMore,
  };
}
