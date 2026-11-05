import { fmtDateTimeParts, fmtPreciseDateTimeParts } from "@/lib/format";

export function DateTimeValue({ epoch, locale, precise = false }: { epoch: number; locale: string; precise?: boolean }) {
  if (precise) {
    const { date, time, zone } = fmtPreciseDateTimeParts(epoch, locale);
    return (
      <span dir="ltr" className="inline-flex flex-wrap gap-x-1.5 font-mono text-[13px]">
        <span className="whitespace-nowrap">{date}</span>
        <span className="whitespace-nowrap">
          {time}
          {zone && <span className="ms-1.5 text-muted-foreground">{zone}</span>}
        </span>
      </span>
    );
  }
  const { date, time } = fmtDateTimeParts(epoch, locale);
  return (
    <span dir="ltr" className="inline-flex flex-wrap gap-x-1.5 font-mono text-[13px]">
      <span className="whitespace-nowrap">{date}</span>
      <span className="whitespace-nowrap">{time}</span>
    </span>
  );
}
