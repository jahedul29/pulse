"use client";

import { cn } from "@/lib/utils";
import { isTemplateHtml, sanitizeTemplateHtml } from "@/lib/notifications/sanitize";
import { plainTextToHtml, renderTemplate } from "@/lib/notifications/variables";

export const TEMPLATE_HTML_CLASS =
  "[&_.highlight]:text-accent-foreground [&_a.highlight]:underline [&_a.highlight]:decoration-accent-foreground/40 [&_a.highlight]:underline-offset-2";

export function TemplateHtml({
  html,
  dir,
  sample = false,
  className,
}: {
  html: string;
  dir: "ltr" | "rtl" | "auto";
  sample?: boolean;
  className?: string;
}) {
  const source = isTemplateHtml(html) ? html : plainTextToHtml(html);
  const content = sanitizeTemplateHtml(sample ? renderTemplate(source, dir === "rtl" ? "ar" : "en") : source);
  return (
    <div
      dir={dir}
      className={cn("text-start text-sm [&_p]:my-0 [&_p+p]:mt-2", TEMPLATE_HTML_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
