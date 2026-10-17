const INTERNAL_ORIGIN = "http://internal.invalid";
const UNSAFE_CHARACTERS = /[\u0000-\u001F\u007F\\]/;

export function safeInternalPath(path: unknown): string | null {
  if (typeof path !== "string" || !path.startsWith("/") || UNSAFE_CHARACTERS.test(path)) return null;
  let url: URL;
  try {
    url = new URL(path, INTERNAL_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== INTERNAL_ORIGIN || url.pathname.startsWith("//")) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
