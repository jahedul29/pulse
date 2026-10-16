function closingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") depth -= 1;
    if (depth === 0) return i;
  }
  return text.length - 1;
}

function choosePlural(text: string, values: Record<string, unknown>): string {
  const match = /\{(\w+), plural, /.exec(text);
  if (!match) return text;
  const start = match.index;
  const end = closingBrace(text, start);
  const options: Record<string, string> = {};
  let cursor = start + match[0].length;
  while (cursor < end) {
    const keyMatch = /\s*(=\d+|\w+)\s*\{/.exec(text.slice(cursor, end));
    if (!keyMatch) break;
    const bodyStart = cursor + keyMatch.index + keyMatch[0].length - 1;
    const bodyEnd = closingBrace(text, bodyStart);
    options[keyMatch[1]] = text.slice(bodyStart + 1, bodyEnd);
    cursor = bodyEnd + 1;
  }
  const count = Number(values[match[1]]);
  const branch = options[`=${count}`] ?? (count === 1 && options.one !== undefined ? options.one : options.other) ?? "";
  return choosePlural(text.slice(0, start) + branch.replaceAll("#", String(count)) + text.slice(end + 1), values);
}

export function translate(messages: unknown, path: string, values: Record<string, unknown> = {}): string {
  const value = path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
  let text = choosePlural(typeof value === "string" ? value : path.split(".").pop() ?? path, values);
  for (const [name, replacement] of Object.entries(values)) text = text.split(`{${name}}`).join(String(replacement));
  return text;
}
