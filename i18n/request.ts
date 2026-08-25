import { getRequestConfig } from "next-intl/server";
import { IntlErrorCode } from "next-intl";
import { getUserLocale } from "./locale";
import { enFallback } from "@/lib/i18n/fallback";
import { TIME_ZONE } from "./routing";

export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`../messages/${locale}.json`)).default,
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        if (process.env.NODE_ENV !== "production") console.warn(`[i18n] ${error.message}`);
      } else {
        console.error(error);
      }
    },
    getMessageFallback({ namespace, key }) {
      return enFallback(namespace, key);
    },
  };
});
