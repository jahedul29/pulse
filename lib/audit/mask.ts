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
  /(email|e-mail|password|passwd|pwd|token|secret|hash|card|cvv|iban|ssn|national|passport|phone|mobile|dob|birth)/i;

export function isSensitiveField(name: string): boolean {
  return SENSITIVE_FIELD_RE.test(name);
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
