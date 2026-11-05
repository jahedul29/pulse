"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useEditorState, type Editor } from "@tiptap/react";
import { Check, Highlighter, Link2, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EditorToolButton } from "@/components/ui/rich-text-editor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TEMPLATE_ACTION, TEMPLATE_HIGHLIGHT } from "@/components/notifications/template-editor-marks";
import { TEMPLATE_ACTIONS, type TemplateAction } from "@/lib/notifications/dto";

export function TemplateBodyTools({ editor }: { editor: Editor }) {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      highlighted: current.isActive(TEMPLATE_HIGHLIGHT),
      action: (current.getAttributes(TEMPLATE_ACTION).action as string | undefined) ?? null,
      empty: current.state.selection.empty,
    }),
  });
  const canLink = !state.empty || state.action != null;

  const applyAction = (action: TemplateAction) => {
    const chain = state.action != null ? editor.chain().focus().extendMarkRange(TEMPLATE_ACTION) : editor.chain().focus();
    chain.setMark(TEMPLATE_ACTION, { action }).run();
    setOpen(false);
  };
  const removeAction = () => {
    editor.chain().focus().extendMarkRange(TEMPLATE_ACTION).unsetMark(TEMPLATE_ACTION).run();
    setOpen(false);
  };

  return (
    <>
      <EditorToolButton
        active={state.highlighted}
        onClick={() => editor.chain().focus().toggleMark(TEMPLATE_HIGHLIGHT).run()}
        label={t("editor.highlight")}
        tooltip={t("editor.highlightHint")}
      >
        <Highlighter className="size-3.5" />
      </EditorToolButton>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onMouseDown={(event) => event.preventDefault()}
                    disabled={!canLink}
                    focusableWhenDisabled
                    aria-label={canLink ? t("editor.actionLink") : t("editor.actionLinkSelect")}
                    className={cn(state.action != null && "bg-accent text-accent-foreground")}
                  />
                }
              />
            }
          >
            <Link2 className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{canLink ? t("editor.actionLinkHint") : t("editor.actionLinkSelect")}</TooltipContent>
        </Tooltip>
        <PopoverContent align="start" className="w-72 p-1">
          <div className="flex flex-col gap-0.5">
            {TEMPLATE_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                aria-pressed={state.action === action}
                onClick={() => applyAction(action)}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-muted"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm">{t(`templates.action_${action}`)}</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">{action}</span>
                </span>
                {state.action === action && <Check aria-hidden className="size-4 shrink-0 text-accent-foreground" />}
              </button>
            ))}
            {state.action != null && (
              <button
                type="button"
                onClick={removeAction}
                className="flex items-center gap-2 rounded-md border-t px-2 py-1.5 text-start text-sm text-danger transition-colors hover:bg-danger/10"
              >
                <Link2Off aria-hidden className="size-4" />
                {t("editor.removeActionLink")}
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
