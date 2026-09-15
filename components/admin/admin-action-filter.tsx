"use client";

import { useMemo } from "react";

import { AsyncMultiFilter, type AsyncOptionsResult } from "@/components/common/async-select";
import { useAdminActionSearch } from "@/lib/admin-actions/queries";

export function useAdminActionOptions(search: string, enabled: boolean): AsyncOptionsResult {
  const actionsQuery = useAdminActionSearch(search, enabled);
  const options = useMemo(
    () =>
      (actionsQuery.data?.pages ?? [])
        .flatMap((page) => page.data)
        .map((action) => ({
          value: action.id,
          label: action.targetType ? `${action.actionName} · ${action.targetType}` : action.actionName,
        })),
    [actionsQuery.data],
  );
  return {
    options,
    isPending: actionsQuery.isPending,
    hasNextPage: Boolean(actionsQuery.hasNextPage),
    isFetchingNextPage: actionsQuery.isFetchingNextPage,
    fetchNextPage: actionsQuery.fetchNextPage,
  };
}

export function AdminActionFilter(props: {
  value: string[];
  onChange: (next: string[] | undefined) => void;
  searchLabel?: string;
  emptyLabel?: string;
}) {
  return <AsyncMultiFilter useOptions={useAdminActionOptions} {...props} />;
}
