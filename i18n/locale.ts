"use server";

import { cookies } from "next/headers";
import { LOCALES, type Locale } from "./routing";

const COOKIE = "NEXT_LOCALE";
const DEFAULT: Locale = "en";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getUserLocale(): Promise<Locale> {
  const value = (await cookies()).get(COOKIE)?.value;
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT;
}

export async function setUserLocale(locale: Locale): Promise<void> {
  const value = LOCALES.includes(locale) ? locale : DEFAULT;
  (await cookies()).set(COOKIE, value, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
}
