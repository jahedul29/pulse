"use client";

import { useCallback, useContext } from "react";
import { QueryClientContext, type FetchQueryOptions, type QueryKey } from "@tanstack/react-query";

export function usePrefetch() {
  const queryClient = useContext(QueryClientContext);
  return useCallback(
    <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
      build: () => FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    ) => {
      if (!queryClient) return;
      try {
        void queryClient.prefetchQuery(build());
      } catch {
        void 0;
      }
    },
    [queryClient],
  );
}
