"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NoAccess } from "@/components/common/no-access";
import { Skeleton } from "@/components/ui/skeleton";
import { accessState, firstAccessiblePath, hasPendingAccess, hasRouteRule, isDefaultLanding } from "@/lib/auth/access";
import { useAccessSnapshot } from "@/lib/auth/access-probes";
import { useIsClient } from "@/lib/use-is-client";
import { PageContainer } from "@/components/common/page-container";

function PendingAccess() {
  return (
    <PageContainer aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="h-64 w-full" />
    </PageContainer>
  );
}

export function AccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isClient = useIsClient();
  const { session, probes } = useAccessSnapshot();
  const denied = isClient && session !== null && accessState(session, pathname, probes) === "denied";
  const startPage = denied ? firstAccessiblePath(session, probes) : null;
  const waiting = denied && !startPage && hasPendingAccess(session, probes);
  const redirectTo = denied && startPage && isDefaultLanding(pathname) ? startPage : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (!isClient) return hasRouteRule(pathname) ? null : children;
  if (!denied) return children;
  if (waiting || redirectTo) return <PendingAccess />;
  return <NoAccess variant="page" />;
}
