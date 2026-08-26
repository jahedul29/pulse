export interface MergeVariable {
  token: string;
  sampleEn: string;
  sampleAr: string;
}

export const MERGE_VARIABLES: MergeVariable[] = [
  { token: "clientName", sampleEn: "Layla Haddad", sampleAr: "ليلى حداد" },
  { token: "therapistName", sampleEn: "Alex Rivera", sampleAr: "أليكس ريفيرا" },
  { token: "sessionDate", sampleEn: "17-Aug-2026", sampleAr: "17-Aug-2026" },
  { token: "sessionTime", sampleEn: "10:00", sampleAr: "10:00" },
  { token: "code", sampleEn: "482913", sampleAr: "482913" },
  { token: "amount", sampleEn: "AED 450.00", sampleAr: "AED 450.00" },
];

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
    const variable = MERGE_VARIABLES.find((v) => v.token === token);
    if (!variable) return match;
    return escapeHtml(locale === "ar" ? variable.sampleAr : variable.sampleEn);
  });
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
