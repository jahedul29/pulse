"use client";

import { useCallback, useEffect, useRef } from "react";
import type { FetchQueryOptions, QueryKey } from "@tanstack/react-query";
import type { DataTableController, ServerTableState } from "@/components/common/data-table";
import { usePrefetch } from "@/lib/api/use-prefetch";
import type { ServerPage } from "@/lib/use-record-pager";

type LoadedPage = { meta?: { current_page?: number } } | undefined;

export function useServerPage<TQueryFnData, TError, TData, TQueryKey extends QueryKey>({
  server,
  pageSize,
  total,
  data,
  failed,
  queryFor,
}: {
  server: ServerTableState | null;
  pageSize: number;
  total: number;
  data: LoadedPage;
  failed: boolean;
  queryFor: (state: ServerTableState) => FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>;
}) {
  const controller = useRef<DataTableController>(null);
  const prefetch = usePrefetch();
  const queryForRef = useRef(queryFor);
  useEffect(() => {
    queryForRef.current = queryFor;
  });
  const prefetchPage = useCallback(
    (pageIndex: number) => {
      if (server) prefetch(() => queryForRef.current({ ...server, pageIndex }));
    },
    [prefetch, server],
  );
  const page: ServerPage = {
    index: server?.pageIndex ?? 0,
    size: server?.pageSize ?? pageSize,
    total,
    loaded: (data?.meta?.current_page ?? 1) - 1,
    failed,
    go: (pageIndex) => controller.current?.goToPage(pageIndex),
    prefetch: prefetchPage,
  };
  return { controller, page };
}
