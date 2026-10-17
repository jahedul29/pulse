"use client";

import { useMemo } from "react";

import { AsyncMultiFilter, type AsyncOptionsResult } from "@/components/common/async-select";
import { useAdminActionSearch } from "@/lib/admin-actions/queries";
import { useTranslations } from "next-intl";
import { ADMIN_ACTION_LOGS_PATH } from "@/lib/api/audit-paths";
import { useProbeDenied } from "@/lib/auth/access-probes";

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
    isPending: actionsQuery.isLoading,
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
  const denied = useProbeDenied(ADMIN_ACTION_LOGS_PATH);
  const tc = useTranslations("common");
  return (
    <AsyncMultiFilter
      useOptions={useAdminActionOptions}
      {...props}
      emptyLabel={denied ? tc("noPermission") : props.emptyLabel}
    />
  );
}
