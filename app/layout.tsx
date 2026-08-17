import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "overlayscrollbars/overlayscrollbars.css";
import "./globals.css";
import { AppScroll } from "@/components/scrollbars";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-data",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ABAPRO — Admin & BI",
  description: "Clients & Profiles console for the ABAPRO physiotherapy platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`theme-violet ${mono.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppScroll>{children}</AppScroll>
      </body>
    </html>
  );
}
