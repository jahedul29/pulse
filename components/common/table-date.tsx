import type { ReactNode } from "react";
import { fmtDateTimeParts } from "@/lib/format";
import { cn } from "@/lib/utils";

export const TABLE_DATE_CLASS = "text-[13px] whitespace-nowrap tabular";

export function TableDateText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(TABLE_DATE_CLASS, className)}>{children}</span>;
}

export function TableDate({
  epoch,
  locale,
  withTime = true,
}: {
  epoch: number | null | undefined;
  locale: string;
  withTime?: boolean;
}) {
  if (epoch == null || Number.isNaN(epoch)) return <TableDateText className="text-muted-foreground">-</TableDateText>;
  const { date, time } = fmtDateTimeParts(epoch, locale);
  return <TableDateText>{withTime ? `${date} ${time}` : date}</TableDateText>;
}
