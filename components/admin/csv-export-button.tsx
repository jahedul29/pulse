"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toolbarIconButtonClass } from "@/components/common/data-table";
import { apiErrorMessage } from "@/lib/api/error-message";

export function CsvExportButton({ onExport }: { onExport: () => Promise<void> }) {
  const tc = useTranslations("common");
  const ta = useTranslations("apiErrors");
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    setBusy(true);
    try {
      await onExport();
    } catch (error) {
      toast.error(apiErrorMessage(error, ta));
    } finally {
      setBusy(false);
    }
  }, [onExport, ta]);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="lg"
            onClick={onClick}
            loading={busy}
            aria-label={tc("export")}
            className={toolbarIconButtonClass}
          />
        }
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">{tc("export")}</span>
      </TooltipTrigger>
      <TooltipContent>{tc("export")}</TooltipContent>
    </Tooltip>
  );
}
