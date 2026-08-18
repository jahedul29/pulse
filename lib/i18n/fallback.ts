import enMessages from "@/messages/en.json";

// Resolves the English string for a (namespace, key) so any missing translation
// falls back to English instead of showing the raw key.
export function enFallback(namespace: string | undefined, key: string): string {
  const full = namespace ? `${namespace}.${key}` : key;
  const value = full
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
      enMessages,
    );
  return typeof value === "string" ? value : full;
}
