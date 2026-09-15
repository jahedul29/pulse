"use client";

import { useMemo } from "react";

import {
  AsyncSelect,
  AsyncMultiFilter,
  type AsyncOptionsResult,
} from "@/components/common/async-select";
import { useChannelSearch, useTemplateSearch } from "@/lib/notifications/queries";

export const TEMPLATE_NONE = "none";

export function useChannelOptions(search: string, enabled: boolean): AsyncOptionsResult {
  const channelQuery = useChannelSearch(search, enabled);
  const options = useMemo(
    () =>
      (channelQuery.data?.pages ?? [])
        .flatMap((page) => page.data)
        .map((channel) => ({ value: String(channel.id), label: channel.name || channel.code })),
    [channelQuery.data],
  );
  return {
    options,
    isPending: channelQuery.isPending,
    hasNextPage: Boolean(channelQuery.hasNextPage),
    isFetchingNextPage: channelQuery.isFetchingNextPage,
    fetchNextPage: channelQuery.fetchNextPage,
  };
}

export function useTemplateOptions(search: string, enabled: boolean): AsyncOptionsResult {
  const templateQuery = useTemplateSearch(search, enabled);
  const options = useMemo(
    () =>
      (templateQuery.data?.pages ?? [])
        .flatMap((page) => page.data)
        .map((template) => ({ value: String(template.id), label: template.name || template.code })),
    [templateQuery.data],
  );
  return {
    options,
    isPending: templateQuery.isPending,
    hasNextPage: Boolean(templateQuery.hasNextPage),
    isFetchingNextPage: templateQuery.isFetchingNextPage,
    fetchNextPage: templateQuery.fetchNextPage,
  };
}

export function ChannelSelect(props: {
  value: string;
  onChange: (next: string) => void;
  selectedLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  id?: string;
  ariaLabel?: string;
}) {
  return <AsyncSelect useOptions={useChannelOptions} {...props} />;
}

export function TemplateSelect({
  noneLabel,
  ...props
}: {
  value: string;
  onChange: (next: string) => void;
  selectedLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  id?: string;
  ariaLabel?: string;
  noneLabel?: string;
}) {
  return (
    <AsyncSelect
      useOptions={useTemplateOptions}
      leadingOptions={noneLabel ? [{ value: TEMPLATE_NONE, label: noneLabel }] : []}
      {...props}
    />
  );
}

export function ChannelFilter(props: {
  value: string[];
  onChange: (next: string[] | undefined) => void;
  searchLabel?: string;
  emptyLabel?: string;
}) {
  return <AsyncMultiFilter useOptions={useChannelOptions} {...props} />;
}
