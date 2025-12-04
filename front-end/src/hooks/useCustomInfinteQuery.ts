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
  const [offset, setOffset] = useState(initialOffset || 0);

  const selector = useAppStore(storeSelector);

  const result = useMemo(() => {
    return normalizeData(selector);
  }, [selector, normalizeData]);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    const { data } = await queryFn({
      ...optionVariables,
      variables: {
        ...optionVariables.variables,
        limit,
        offset,
      },
    });

    setOffset((prev) => prev + limit);
    updateStoreWithData(data);
    setIsLoading(false);
  }, [queryFn, optionVariables, limit, offset, updateStoreWithData]);

  return {
    isLoading,
    result,
    loadMore,
  };
}
