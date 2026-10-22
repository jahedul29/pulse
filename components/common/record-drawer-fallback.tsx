"use client";

import { useTranslations } from "next-intl";
import { LoadError } from "@/components/common/load-error";
import { NoAccess } from "@/components/common/no-access";
import { SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export function RecordDrawerFallback({
  loading,
  error,
  forbidden = false,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  forbidden?: boolean;
  onRetry?: () => void;
}) {
  const tc = useTranslations("common");
  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>{loading && !forbidden ? tc("recordLoading") : tc("recordUnavailable")}</SheetTitle>
      </SheetHeader>
      <SheetBody>
        {forbidden ? (
          <NoAccess className="py-10" />
        ) : loading ? (
          <div className="flex flex-col gap-3" aria-busy>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : (
          <LoadError error={error} message={tc("recordUnavailableBody")} onRetry={onRetry} className="py-10" />
        )}
      </SheetBody>
    </SheetContent>
  );
}
