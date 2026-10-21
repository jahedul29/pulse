"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import { refreshProfileAfterForbidden, registerProfileRefresh, resetProfileRefresh } from "@/lib/auth/profile-refresh";
import { sessionOwner, useAuthStore } from "@/lib/auth/store";

const Devtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : dynamic(
        () =>
          import("@tanstack/react-query-devtools").then((mod) => ({
            default: mod.ReactQueryDevtools,
          })),
        { ssr: false },
      );

const ACCESS_PROBE_KEY = queryKeys.accessProbe("", "", "")[0];

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.queryKey[0] !== queryKeys.me()[0]) refreshProfileAfterForbidden(error);
      },
    }),
    mutationCache: new MutationCache({ onError: (error) => refreshProfileAfterForbidden(error) }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);

  useEffect(() => {
    registerProfileRefresh(() => {
      void client.invalidateQueries({ queryKey: queryKeys.me() });
      void client.invalidateQueries({ queryKey: [ACCESS_PROBE_KEY] });
    });
    return () => registerProfileRefresh(null);
  }, [client]);

  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        const before = sessionOwner(previous.session);
        if (before && before !== sessionOwner(state.session)) {
          client.clear();
          resetProfileRefresh();
        }
      }),
    [client],
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
