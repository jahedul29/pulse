import DOMPurify from "dompurify";
import { TEMPLATE_ACTIONS } from "./dto";

const ACTIONS = new Set<string>(TEMPLATE_ACTIONS);

const CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "span", "a"],
  ALLOWED_ATTR: ["style", "class", "data-action"],
  ALLOW_DATA_ATTR: false,
};

const ALLOWED_VALUES: Record<string, RegExp> = {
  class: /^highlight$/,
  style: /^text-align:\s*(left|center|right);?$/,
};

function keepTemplateAttribute(_node: Element, attribute: { attrName: string; attrValue: string; keepAttr: boolean }) {
  if (attribute.attrName === "data-action") {
    if (!ACTIONS.has(attribute.attrValue.trim())) attribute.keepAttr = false;
    return;
  }
  const allowed = ALLOWED_VALUES[attribute.attrName];
  if (allowed && !allowed.test(attribute.attrValue.trim())) attribute.keepAttr = false;
}

export function sanitizeTemplateHtml(html: string): string {
  if (typeof window === "undefined") return "";
  DOMPurify.addHook("uponSanitizeAttribute", keepTemplateAttribute);
  try {
    return DOMPurify.sanitize(html, CONFIG);
  } finally {
    DOMPurify.removeHook("uponSanitizeAttribute", keepTemplateAttribute);
  }
}

export function isTemplateHtml(text: string): boolean {
  return /<\/?(p|br|span|a|strong|em)\b/i.test(text);
}

function cleanNode(node: Node, doc: Document) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const element = child as Element;
    cleanNode(element, doc);
    const tag = element.tagName.toLowerCase();
    const action = element.getAttribute("data-action") ?? "";
    let kept: Element | null = null;
    if (tag === "p" || tag === "br") kept = doc.createElement(tag);
    else if (tag === "span" && element.classList.contains("highlight")) {
      kept = doc.createElement("span");
      kept.setAttribute("class", "highlight");
    } else if (tag === "a" && ACTIONS.has(action)) {
      kept = doc.createElement("a");
      kept.setAttribute("class", "highlight");
      kept.setAttribute("data-action", action);
    }
    if (kept) {
      kept.append(...Array.from(element.childNodes));
      element.replaceWith(kept);
    } else {
      element.replaceWith(...Array.from(element.childNodes));
    }
  }
}

export function cleanTemplateBodyHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  cleanNode(doc.body, doc);
  return doc.body.innerHTML;
}
