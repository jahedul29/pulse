"use client";

import { useMemo } from "react";

import { AsyncMultiFilter, type AsyncOptionsResult } from "@/components/common/async-select";
import { useAdminUserSearch } from "@/lib/user-management/queries";

export function useAdminUserOptions(search: string, enabled: boolean): AsyncOptionsResult {
  const usersQuery = useAdminUserSearch(search, enabled);
  const options = useMemo(
    () =>
      (usersQuery.data?.pages ?? [])
        .flatMap((page) => page.data)
        .map((user) => ({ value: user.id, label: user.name || user.email })),
    [usersQuery.data],
  );
  return {
    options,
    isPending: usersQuery.isPending,
    hasNextPage: Boolean(usersQuery.hasNextPage),
    isFetchingNextPage: usersQuery.isFetchingNextPage,
    fetchNextPage: usersQuery.fetchNextPage,
  };
}

export function AdminUserFilter(props: {
  value: string[];
  onChange: (next: string[] | undefined) => void;
  searchLabel?: string;
  emptyLabel?: string;
}) {
  return <AsyncMultiFilter useOptions={useAdminUserOptions} {...props} />;
}
