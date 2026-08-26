"use client";

import { useEffect, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(active && "bg-accent text-accent-foreground")}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  dir = "ltr",
  ariaLabel,
  labels = DEFAULT_LABELS,
  extraTools,
}: {
  value: string;
  onChange: (html: string) => void;
  dir?: "ltr" | "rtl";
  ariaLabel?: string;
  labels?: ToolbarLabels;
  extraTools?: (editor: Editor) => ReactNode;
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
      }),
      TextAlign.configure({ types: ["paragraph"], alignments: ["left", "center", "right"] }),
    ],
    content: value,
    editorProps: {
      attributes: { class: EDITOR_CLASS, dir, ...(ariaLabel ? { "aria-label": ariaLabel } : {}) },
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
        <ToolButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label={labels.bold}
        >
          <Bold className="size-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label={labels.italic}
        >
          <Italic className="size-3.5" />
        </ToolButton>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <ToolButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          label={labels.alignLeft}
        >
          <AlignLeft className="size-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          label={labels.alignCenter}
        >
          <AlignCenter className="size-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          label={labels.alignRight}
        >
          <AlignRight className="size-3.5" />
        </ToolButton>
        {extraTools && <span className="ms-auto">{extraTools(editor)}</span>}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
