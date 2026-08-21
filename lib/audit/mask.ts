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
