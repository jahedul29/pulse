// Locale-aware short calendar labels, derived from Intl. Latin/other digits are not
// involved here — these are month/weekday *names*. Week starts on Monday app-wide.

export function monthShortLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, month) => fmt.format(new Date(Date.UTC(2021, month, 15))));
}

// 2021-03-01 is a Monday, so this yields Monday-first weekday labels.
export function weekdayShortLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2021, 2, 1 + i))));
}

export function weekdayTwoCharLabels(locale: string): string[] {
  return weekdayShortLabels(locale).map((weekday) => weekday.slice(0, 2).toUpperCase());
}

export function weekdayNarrowLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2021, 2, 1 + i))));
}
