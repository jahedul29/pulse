"use client";

import { useMemo } from "react";

import { AsyncMultiFilter, type AsyncOptionsResult } from "@/components/common/async-select";
import { useCampaignSearch } from "@/lib/notifications/queries";

export function useCampaignOptions(search: string, enabled: boolean): AsyncOptionsResult {
  const campaignQuery = useCampaignSearch(search, enabled);
  const options = useMemo(
    () =>
      (campaignQuery.data?.pages ?? [])
        .flatMap((page) => page.data)
        .map((campaign) => ({ value: campaign.id, label: campaign.name || campaign.id })),
    [campaignQuery.data],
  );
  return {
    options,
    isPending: campaignQuery.isPending,
    hasNextPage: Boolean(campaignQuery.hasNextPage),
    isFetchingNextPage: campaignQuery.isFetchingNextPage,
    fetchNextPage: campaignQuery.fetchNextPage,
  };
}

export function CampaignFilter(props: {
  value: string[];
  onChange: (next: string[] | undefined) => void;
  searchLabel?: string;
  emptyLabel?: string;
}) {
  return <AsyncMultiFilter useOptions={useCampaignOptions} {...props} />;
}
