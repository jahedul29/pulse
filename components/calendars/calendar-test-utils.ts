import mockMessages from "../../messages/en.json";
import type { Translate } from "@/lib/calendars/map";
import { translate } from "@/components/locations/test-intl";

type Values = Record<string, string | number>;

function lookup(path: string): string | undefined {
  let node: unknown = mockMessages;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function translateFromEnglish(key: string, values?: Values): string {
  const template = lookup(key);
  if (template === undefined) return key;
  return translate(mockMessages, key, values);
}

export function englishTranslator(): Translate {
  return Object.assign(translateFromEnglish, { raw: (key: string) => lookup(key) ?? key });
}
