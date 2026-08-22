"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Laptop, LogOut, Smartphone } from "lucide-react";

import { fmtDateTime, fmtDateTimeParts, fmtRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { fetchSessions } from "@/lib/sessions/api";
import { useSessionStore } from "@/lib/sessions/store";
import { useAuthStore } from "@/lib/auth/store";
import { deviceLabelFromUA } from "@/lib/device";
import type { DeviceSession } from "@/lib/sessions/types";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

function DeviceCell({ session }: { session: DeviceSession }) {
  const ua = session.userAgent ?? "";
  const Icon = /iPhone|iPad|Android/.test(ua) ? Smartphone : Laptop;
  const sub = ua ? deviceLabelFromUA(ua) : undefined;
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/20">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <div className="truncate font-medium">{session.deviceName}</div>
        {sub && sub !== session.deviceName && (
          <div className="truncate text-xs text-muted-foreground">{sub}</div>
        )}
      </div>
    </div>
  );
}

function RelTime({ ms, mounted, locale }: { ms: number; mounted: boolean; locale: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="cursor-default whitespace-nowrap tabular" />}>
        {mounted ? fmtRelative(ms, locale) : fmtDateTimeParts(ms, locale).date}
      </TooltipTrigger>
      <TooltipContent>{fmtDateTime(ms, locale)}</TooltipContent>
    </Tooltip>
  );
}

function RevokeButton({
  label,
  hint,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onClick();
            }}
            className={cn(
              "text-muted-foreground",
              disabled ? "opacity-50" : "hover:bg-danger-muted hover:text-danger",
            )}
          />
        }
      >
        <LogOut className="size-4 rtl:-scale-x-100" />
      </TooltipTrigger>
      <TooltipContent>{disabled ? hint : label}</TooltipContent>
    </Tooltip>
  );
}

export function SessionManager() {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const mounted = useIsClient();
  const revoke = useSessionStore((s) => s.revoke);
  const revokeAllOthers = useSessionStore((s) => s.revokeAllOthers);
  const others = useSessionStore((s) => s.others);
  const session = useAuthStore((s) => s.session);
  const [rows, setRows] = useState<DeviceSession[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reload = useCallback(() => {
    fetchSessions().then(setRows);
  }, []);

  useEffect(() => {
    let active = true;
    fetchSessions().then((r) => {
      if (active) setRows(r);
    });
    return () => {
      active = false;
    };
  }, [others, session]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  const otherCount = rows.filter((r) => !r.current).length;

  const onRevoke = useCallback(
    (session: DeviceSession) => {
      revoke(session.id);
      toast.success(t("revokedToast", { device: session.deviceName }));
    },
    [revoke, t],
  );

  const onRevokeAll = () => {
    const count = otherCount;
    revokeAllOthers();
    setConfirmOpen(false);
    toast.success(t("revokedAllToast", { count }));
  };

  const columns = useMemo<ColumnDef<DeviceSession, unknown>[]>(
    () => [
      {
        id: "device",
        accessorFn: (s) => s.deviceName,
        size: 260,
        header: t("colDevice"),
        cell: ({ row }) => <DeviceCell session={row.original} />,
      },
      {
        id: "issued",
        accessorFn: (s) => s.issuedAt,
        size: 160,
        header: t("colIssued"),
        cell: ({ row }) => <RelTime ms={row.original.issuedAt} mounted={mounted} locale={locale} />,
      },
      {
        id: "expires",
        accessorFn: (s) => s.expiresAt,
        size: 160,
        header: t("colExpires"),
        cell: ({ row }) => <RelTime ms={row.original.expiresAt} mounted={mounted} locale={locale} />,
      },
      {
        id: "current",
        accessorFn: (s) => (s.current ? 1 : 0),
        size: 140,
        enableSorting: false,
        header: t("colCurrent"),
        cell: ({ row }) =>
          row.original.current ? (
            <StatusBadge tone="success" equalWidth={false}>
              {t("thisDevice")}
            </StatusBadge>
          ) : null,
      },
      {
        id: "actions",
        size: 110,
        enableSorting: false,
        header: t("colAction"),
        cell: ({ row }) => (
          <RevokeButton
            label={t("revoke")}
            hint={t("revokeCurrentHint")}
            disabled={row.original.current}
            onClick={() => onRevoke(row.original)}
          />
        ),
        meta: { headClassName: "text-end", cellClassName: "text-end" },
      },
    ],
    [t, locale, mounted, onRevoke],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            searchPlaceholder={t("search")}
            emptyLabel={t("empty")}
            itemsLabel={t("items")}
            getSearchText={(s) => `${s.deviceName} ${s.userAgent ?? ""}`}
            enableFreeze
            maxFreeze={3}
            rowClassName={(s) => (s.current ? "bg-primary/5" : undefined)}
            toolbar={
              otherCount > 0 ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setConfirmOpen(true)}
                        aria-label={t("signOutAll")}
                        className={toolbarIconButtonClass}
                      />
                    }
                  >
                    <LogOut className="rtl:-scale-x-100" />
                    <span className="hidden sm:inline">{t("signOutAll")}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("signOutAll")}</TooltipContent>
                </Tooltip>
              ) : null
            }
          />

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("confirmBody", { count: otherCount })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onRevokeAll}>
                  {t("confirmAction")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
