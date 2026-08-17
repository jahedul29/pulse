"use client";

import type { ReactNode } from "react";
import { IntlErrorCode, NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { enFallback } from "@/lib/i18n/fallback";

export function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (error.code === IntlErrorCode.MISSING_MESSAGE) {
          if (process.env.NODE_ENV !== "production") console.warn(`[i18n] ${error.message}`);
        } else {
          console.error(error);
        }
      }}
      getMessageFallback={({ namespace, key }) => enFallback(namespace, key)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
