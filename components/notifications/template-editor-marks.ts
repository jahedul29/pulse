import { Mark, mergeAttributes } from "@tiptap/react";
import { TEMPLATE_ACTIONS } from "@/lib/notifications/dto";

const ACTIONS = new Set<string>(TEMPLATE_ACTIONS);

export const TEMPLATE_HIGHLIGHT = "templateHighlight";
export const TEMPLATE_ACTION = "templateAction";

export const TemplateHighlightMark = Mark.create({
  name: TEMPLATE_HIGHLIGHT,
  parseHTML() {
    return [{ tag: "span.highlight" }];
  },
  renderHTML() {
    return ["span", { class: "highlight" }, 0];
  },
});

export const TemplateActionMark = Mark.create({
  name: TEMPLATE_ACTION,
  priority: 1000,
  inclusive: false,
  excludes: TEMPLATE_HIGHLIGHT,
  addAttributes() {
    return {
      action: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-action"),
        renderHTML: (attributes: { action?: string | null }) =>
          attributes.action ? { "data-action": attributes.action } : {},
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "a[data-action]",
        getAttrs: (element: HTMLElement) => (ACTIONS.has(element.getAttribute("data-action") ?? "") ? null : false),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["a", mergeAttributes({ class: "highlight" }, HTMLAttributes), 0];
  },
});

export const TEMPLATE_BODY_MARKS = [TemplateHighlightMark, TemplateActionMark];
