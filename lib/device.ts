export function deviceLabelFromUA(ua: string): string {
  const os = /Mac/.test(ua)
    ? "macOS"
    : /Windows/.test(ua)
      ? "Windows"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : "Linux";
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /Chrome/.test(ua)
      ? "Chrome"
      : /Firefox/.test(ua)
        ? "Firefox"
        : /Safari/.test(ua)
          ? "Safari"
          : "Browser";
  return `${browser} · ${os}`;
}

export function currentDeviceLabel(fallback = "Unknown device"): string {
  if (typeof navigator === "undefined") return fallback;
  return deviceLabelFromUA(navigator.userAgent);
}
