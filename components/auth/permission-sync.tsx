"use client";

import { useEffect } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { PROBE_ENDPOINTS, type ProbeResults } from "@/lib/auth/access";
import { useAccessProbes } from "@/lib/auth/access-probes";
import { probeEndpoint, type ProbeOutcome } from "@/lib/auth/probe-api";
import { fetchMe } from "@/lib/auth/api";
import { sessionOwner, useAuthStore } from "@/lib/auth/store";
import { useAuthed } from "@/lib/auth/use-authed";

const PROFILE_STALE_MS = 60_000;
const PROBE_STALE_MS = 5 * 60_000;
const UNREACHABLE_RETRY_MS = 30_000;

function unreachable(query: { state: { data?: ProbeOutcome } }): boolean {
  return query.state.data === "unreachable";
}

export function PermissionSync() {
  const authed = useAuthed();
  const syncProfile = useAuthStore((state) => state.syncProfile);
  const owner = useAuthStore((state) => sessionOwner(state.session));
  const permissionsKey = useAuthStore((state) => [...(state.session?.permissions ?? [])].sort().join(","));
  const recordProbes = useAccessProbes((state) => state.record);
  const { data } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    enabled: authed,
    staleTime: PROFILE_STALE_MS,
    refetchOnWindowFocus: true,
  });
  const probes = useQueries({
    queries: PROBE_ENDPOINTS.map((endpoint) => ({
      queryKey: queryKeys.accessProbe(endpoint, owner ?? "", permissionsKey),
      queryFn: () => probeEndpoint(endpoint),
      enabled: authed && owner !== null,
      staleTime: (query: { state: { data?: ProbeOutcome } }) => (unreachable(query) ? 0 : PROBE_STALE_MS),
      refetchInterval: (query: { state: { data?: ProbeOutcome } }) => (unreachable(query) ? UNREACHABLE_RETRY_MS : false),
    })),
    combine: (results): ProbeResults =>
      Object.fromEntries(
        PROBE_ENDPOINTS.flatMap((endpoint, index) => {
          const outcome = results[index]?.data;
          return outcome ? [[endpoint, outcome !== "denied"]] : [];
        }),
      ),
  });

  useEffect(() => {
    if (data) syncProfile(data);
  }, [data, syncProfile]);

  useEffect(() => {
    if (owner) recordProbes(owner, probes);
  }, [owner, probes, recordProbes]);

  return null;
}
