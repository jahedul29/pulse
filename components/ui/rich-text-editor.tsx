"use client";

import { useEffect, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor, type Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ToolbarLabels = {
  bold: string;
  italic: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
};

const DEFAULT_LABELS: ToolbarLabels = {
  bold: "Bold",
  italic: "Italic",
  alignLeft: "Align left",
  alignCenter: "Align center",
  alignRight: "Align right",
};

const EDITOR_CLASS =
  "min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm whitespace-pre-wrap outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40 [&_p]:my-0 [&_strong]:font-semibold";

export function EditorToolButton({
  active,
  onClick,
  label,
  tooltip,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tooltip?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            focusableWhenDisabled
            className={cn(active && "bg-accent text-accent-foreground")}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{tooltip ?? label}</TooltipContent>
    </Tooltip>
  );
}

export function RichTextEditor({
  value,
  onChange,
  dir = "ltr",
  ariaLabel,
  labels = DEFAULT_LABELS,
  extraTools,
  extensions = [],
  basicTools = true,
  contentClassName,
}: {
  value: string;
  onChange: (html: string) => void;
  dir?: "ltr" | "rtl";
  ariaLabel?: string;
  labels?: ToolbarLabels;
  extraTools?: (editor: Editor) => ReactNode;
  extensions?: Extensions;
  basicTools?: boolean;
  contentClassName?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        code: false,
        strike: false,
        link: false,
        ...(basicTools ? {} : { bold: false, italic: false, underline: false }),
      }),
      ...(basicTools ? [TextAlign.configure({ types: ["paragraph"], alignments: ["left", "center", "right"] })] : []),
      ...extensions,
    ],
    content: value,
    editorProps: {
      attributes: { class: cn(EDITOR_CLASS, contentClassName), dir, ...(ariaLabel ? { "aria-label": ariaLabel } : {}) },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return <div className={EDITOR_CLASS} aria-hidden />;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {basicTools && (
          <>
            <EditorToolButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              label={labels.bold}
            >
              <Bold className="size-3.5" />
            </EditorToolButton>
            <EditorToolButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              label={labels.italic}
            >
              <Italic className="size-3.5" />
            </EditorToolButton>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <EditorToolButton
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              label={labels.alignLeft}
            >
              <AlignLeft className="size-3.5" />
            </EditorToolButton>
            <EditorToolButton
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              label={labels.alignCenter}
            >
              <AlignCenter className="size-3.5" />
            </EditorToolButton>
            <EditorToolButton
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              label={labels.alignRight}
            >
              <AlignRight className="size-3.5" />
            </EditorToolButton>
          </>
        )}
        {extraTools?.(editor)}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
