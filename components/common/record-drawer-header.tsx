"use client";

import type { ReactNode } from "react";
import { Link2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/common/copy-button";
import { RecordPager } from "@/components/common/record-pager";
import { SummaryStrip, type SummaryItem } from "@/components/common/summary-strip";
import { SheetClose, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
      <div className="flex min-h-9 items-center gap-2">
        {pager && <RecordPager pager={pager} disabledReason={pagerDisabledReason} className="pe-0" />}
        <div className="ms-auto flex items-center gap-1">
          {link && (
            <CopyButton
              showLabel
              icon={Link2}
              value={() => `${window.location.origin}${link}`}
              label={tc("copyLink")}
              copiedLabel={tc("linkCopied")}
            />
          )}
          <SheetClose render={<Button variant="ghost" size="icon-lg" aria-label={tc("close")} />}>
            <X aria-hidden className="size-4.5" />
          </SheetClose>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <SheetTitle className="text-[22px] leading-tight tracking-[-0.01em] break-words rtl:tracking-normal">{title}</SheetTitle>
        {subtitle && <SheetDescription className="text-[13px] break-words">{subtitle}</SheetDescription>}
      </div>
      {summary && summary.length > 0 && <SummaryStrip items={summary} />}
    </SheetHeader>
  );
}
