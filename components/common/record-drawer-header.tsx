"use client";

import type { ReactNode } from "react";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/common/copy-button";
import { RecordPager } from "@/components/common/record-pager";
import { SummaryStrip, type SummaryItem } from "@/components/common/summary-strip";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { RecordPager as RecordPagerState } from "@/lib/use-record-pager";

export function RecordDrawerHeader({
  pager,
  pagerDisabledReason,
  link,
  title,
  subtitle,
  summary,
}: {
  pager?: RecordPagerState;
  pagerDisabledReason?: string;
  link?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  summary?: SummaryItem[];
}) {
  const tc = useTranslations("common");
  return (
    <SheetHeader className="gap-3">
      <div className="flex min-h-7 items-center gap-2 pe-9">
        {pager && <RecordPager pager={pager} disabledReason={pagerDisabledReason} className="pe-0" />}
        {link && (
          <div className="ms-auto flex items-center">
            <CopyButton
              showLabel
              icon={Link2}
              value={() => `${window.location.origin}${link}`}
              label={tc("copyLink")}
              copiedLabel={tc("linkCopied")}
            />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <SheetTitle className="leading-snug break-words">{title}</SheetTitle>
        {subtitle && <SheetDescription className="break-words">{subtitle}</SheetDescription>}
      </div>
      {summary && summary.length > 0 && <SummaryStrip items={summary} />}
    </SheetHeader>
  );
}
