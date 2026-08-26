import DOMPurify from "dompurify";

const CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em"],
  ALLOWED_ATTR: ["style"],
};

export function sanitizeTemplateHtml(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, "");
  return DOMPurify.sanitize(html, CONFIG);
}
