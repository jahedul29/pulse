export function maskIdentifier(identifier: string): string {
  const at = identifier.indexOf("@");
  if (at <= 0) {
    if (identifier.length <= 1) return "***";
    return `${identifier[0]}***`;
  }
  const local = identifier.slice(0, at);
  const domain = identifier.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const tld = dot >= 0 ? domain.slice(dot) : "";
  const localMasked = local.length <= 1 ? `${local}***` : `${local[0]}***`;
  return `${localMasked}@***${tld}`;
}

const SENSITIVE_FIELD_RE =
  /(email|e-mail|password|passwd|pwd|token|secret|hash|card|cvv|cvc|iban|ssn|national|passport|phone|mobile|dob|birth|api_key|apikey|access_key|private_key|signing_key|credential|authorization|bearer|otp|session|cookie|signature|jwt)/i;

const SENSITIVE_TOKEN_RE = /(^|[^a-z0-9])(pin|ip|ip_address|address|link|url)($|[^a-z0-9])/i;

export function isSensitiveField(name: string): boolean {
  return SENSITIVE_FIELD_RE.test(name) || SENSITIVE_TOKEN_RE.test(name);
}

export function maskKey(key: string): string {
  return key.includes("@") ? maskIdentifier(key) : key;
}

export function parseJsonText(value: string): unknown {
  const text = value.trim();
  if (!(text.startsWith("{") && text.endsWith("}")) && !(text.startsWith("[") && text.endsWith("]"))) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function maskValue(value: string): string {
  if (value.includes("@")) return maskIdentifier(value);
  if (value.length <= 2) return "•••";
  return `${value[0]}••••`;
}

export function maskColumnValue(column: string, value: string | null): string | null {
  if (value == null) return null;
  return isSensitiveField(column) || value.includes("@") ? maskValue(value) : value;
}

export function maskInputValue(label: string, value: string): string {
  return isSensitiveField(label) || value.includes("@") ? maskValue(value) : value;
}

const REDACTED = /^[\s\S]?•{3,4}$/;

export function isRedacted(value: string | null | undefined): boolean {
  return typeof value === "string" && REDACTED.test(value);
}
