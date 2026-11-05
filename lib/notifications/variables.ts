export interface MergeVariable {
  token: string;
  sampleEn: string;
  sampleAr: string;
}

export const MERGE_VARIABLES: MergeVariable[] = [{ token: "first_name", sampleEn: "Layla", sampleAr: "ليلى" }];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderTemplate(text: string, locale: string): string {
  return text.replace(/\{(\w+)\}/g, (match, token) => {
    const variable = MERGE_VARIABLES.find((candidate) => candidate.token === token);
    if (!variable) return match;
    return escapeHtml(locale === "ar" ? variable.sampleAr : variable.sampleEn);
  });
}

export function plainTextToHtml(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
