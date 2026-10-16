"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function LocationRowActions({
  name,
  canEdit,
  editLabel,
  deleteLabel,
  editAriaLabel,
  deleteAriaLabel,
  deleteBlockedReason,
  onEdit,
  onDelete,
}: {
  name: string;
  canEdit: boolean;
  editLabel: string;
  deleteLabel: string;
  editAriaLabel: string;
  deleteAriaLabel: string;
  deleteBlockedReason?: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tc = useTranslations("common");
  const deleteReason = canEdit ? (deleteBlockedReason ?? null) : tc("noPermission");
  return (
    <div
      role="group"
      aria-label={name}
      className="flex items-center justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onEdit}
              focusableWhenDisabled
              disabled={!canEdit}
              aria-label={editAriaLabel}
              className="data-[disabled]:hover:bg-transparent"
            />
          }
        >
          <Pencil className="size-4" />
        </TooltipTrigger>
        <TooltipContent>{canEdit ? editLabel : tc("noPermission")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onDelete}
              focusableWhenDisabled
              disabled={deleteReason !== null}
              aria-label={deleteAriaLabel}
              className="hover:bg-danger/10 hover:text-danger data-[disabled]:hover:bg-transparent data-[disabled]:hover:text-foreground"
            />
          }
        >
          <Trash2 className="size-4" />
        </TooltipTrigger>
        <TooltipContent>{deleteReason ?? deleteLabel}</TooltipContent>
      </Tooltip>
    </div>
  );
}
