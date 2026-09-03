"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { IntlErrorCode, NextIntlClientProvider } from "next-intl";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import { enFallback } from "@/lib/i18n/fallback";
import { TIME_ZONE, dirFor, type Locale } from "@/i18n/routing";

const MESSAGES = { en, ar } as const;
const COOKIE = "NEXT_LOCALE";
const ONE_YEAR = 60 * 60 * 24 * 365;

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: "en",
  setLocale: () => {},
});

export function useSetLocale() {
  return useContext(LocaleContext);
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      if (typeof document !== "undefined") {
        document.cookie = `${COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
        document.documentElement.setAttribute("lang", next);
        document.documentElement.setAttribute("dir", dirFor(next));
      }
      setLocaleState(next);
    },
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES[locale]}
        timeZone={TIME_ZONE}
        onError={(error) => {
          if (error.code === IntlErrorCode.MISSING_MESSAGE) {
            if (process.env.NODE_ENV !== "production") console.warn(`[i18n] ${error.message}`);
          } else {
            console.error(error);
          }
        }}
        getMessageFallback={({ namespace, key }) => enFallback(namespace, key)}
      >
        <DirectionProvider direction={dirFor(locale)}>{children}</DirectionProvider>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
