export function escapeCell(value: string | number): string {
  let cell = String(value);
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  if (typeof document === "undefined") return;
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
