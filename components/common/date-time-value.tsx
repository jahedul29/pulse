import { fmtDateTimeParts } from "@/lib/format";

export function DateTimeValue({ epoch, locale }: { epoch: number; locale: string }) {
  const { date, time } = fmtDateTimeParts(epoch, locale);
  return (
    <span dir="ltr" className="inline-flex flex-wrap gap-x-1.5 font-mono text-[13px]">
      <span className="whitespace-nowrap">{date}</span>
      <span className="whitespace-nowrap">{time}</span>
    </span>
  );
}
