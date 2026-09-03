const KEY = "abapro_fingerprint";

export function deviceFingerprint(): string {
  if (typeof window === "undefined") return "server";
  try {
    let fp = window.localStorage.getItem(KEY);
    if (!fp) {
      fp = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `fp-${Date.now()}`;
      window.localStorage.setItem(KEY, fp);
    }
    return fp;
  } catch {
    return "no-storage";
  }
}
