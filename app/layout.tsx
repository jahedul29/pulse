import type { Metadata } from "next";
import { Hind, IBM_Plex_Sans_Arabic, JetBrains_Mono, Manrope } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { IntlProvider } from "@/components/i18n-provider";
import "overlayscrollbars/overlayscrollbars.css";
import "./globals.css";
import { AppScroll } from "@/components/scrollbars";
import { dirFor } from "@/i18n/routing";

const manrope = Manrope({
  variable: "--font-manrope-src",
  subsets: ["latin", "cyrillic"],
});

const hind = Hind({
  variable: "--font-hind",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-data",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ABAPRO — Admin & BI",
  description: "Clients & Profiles console for the ABAPRO physiotherapy platform.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`theme-violet ${mono.variable} ${manrope.variable} ${hind.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <IntlProvider locale={locale} messages={messages}>
          <DirectionProvider direction={dirFor(locale)}>
            <AppScroll>{children}</AppScroll>
          </DirectionProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
