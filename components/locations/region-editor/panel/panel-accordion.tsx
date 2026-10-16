"use client";

import type { ReactNode } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

export interface PanelAccordionItem {
  value: string;
  title: string;
  summary?: ReactNode;
  content: ReactNode;
}

export function PanelAccordion({
  items,
  openItems,
  onOpenItemsChange,
}: {
  items: PanelAccordionItem[];
  openItems: string[];
  onOpenItemsChange: (values: string[]) => void;
}) {
  return (
    <Accordion.Root
      multiple
      value={openItems}
      onValueChange={(values) => onOpenItemsChange(values as string[])}
      className="flex flex-col"
    >
      {items.map((item) => (
        <Accordion.Item key={item.value} value={item.value} className="border-b last:border-b-0">
          <Accordion.Header className="m-0">
            <Accordion.Trigger className="group flex w-full items-center gap-2 px-4 py-3 text-start text-sm font-semibold outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset">
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              {item.summary ? (
                <span className="tabular max-w-[45%] truncate text-xs font-medium text-muted-foreground group-data-[panel-open]:hidden">
                  {item.summary}
                </span>
              ) : null}
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
            <div className="flex flex-col gap-3 px-4 pt-1 pb-4">{item.content}</div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
