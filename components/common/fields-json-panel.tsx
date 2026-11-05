"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Braces } from "lucide-react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/common/copy-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PanelView = "fields" | "json";

export function FieldsJsonPanel({
  title,
  fields,
  json,
  copyJson,
  fieldsFooter,
}: {
  title: string;
  fields: ReactNode;
  json: string;
  copyJson: () => string;
  fieldsFooter?: ReactNode;
}) {
  const tc = useTranslations("common");
  const [view, setView] = useState<PanelView>("fields");
  return (
    <div className="flex flex-col gap-2">
      <Tabs
        value={view}
        onValueChange={(next) => setView(next as PanelView)}
        className="gap-0 overflow-hidden rounded-[10px] border"
      >
        <div className="flex items-center gap-2 border-b bg-muted/40 py-1.5 ps-3.5 pe-1.5">
          <span className="min-w-0 truncate text-[13px] font-medium">{title}</span>
          <div className="ms-auto flex shrink-0 items-center gap-1">
            <TabsList aria-label={tc("viewAs")}>
              <TabsTrigger value="fields" className="px-2 text-xs">
                {tc("viewFields")}
              </TabsTrigger>
              <TabsTrigger value="json" className="px-2 text-xs">
                {tc("viewJson")}
              </TabsTrigger>
            </TabsList>
            <CopyButton value={copyJson} label={tc("copyJson")} copiedLabel={tc("jsonCopied")} icon={Braces} />
          </div>
        </div>
        <TabsContent value="fields">{fields}</TabsContent>
        <TabsContent value="json">
          <div
            dir="ltr"
            tabIndex={0}
            role="region"
            aria-label={tc("viewJson")}
            className="max-h-96 overflow-auto bg-foreground text-background scheme-dark outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-background dark:text-foreground"
          >
            <pre className="p-3.5 font-mono text-xs leading-relaxed whitespace-pre">{json}</pre>
          </div>
        </TabsContent>
      </Tabs>
      {view === "fields" && fieldsFooter}
    </div>
  );
}

export function PanelEmpty({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("px-3.5 py-3 text-center text-sm text-muted-foreground", className)}>{children}</p>;
}
