"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/common/status-badge";
import { AccountLockout } from "@/components/common/account-lockout";
import { useAdminStore } from "@/lib/auth/admins";
import { useAuthStore } from "@/lib/auth/store";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import { useIsClient } from "@/lib/use-is-client";

export function AdminAccounts() {
  const t = useTranslations("adminAccounts");
  const admins = useAdminStore((s) => s.admins);
  const unlock = useAdminStore((s) => s.unlock);
  const canUnlock = useHasPermission(PERMISSIONS.ACCOUNT_LOCK_EDIT);
  const session = useAuthStore((s) => s.session);
  const [expired, setExpired] = React.useState<ReadonlySet<string>>(() => new Set());
  const mounted = useIsClient();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{t("subtitle")}</p>
        {session ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("viewingAs", { name: session.name, role: session.role })}
          </p>
        ) : null}
      </header>

      <ul className="flex flex-col gap-3">
        {admins.map((a) => {
          const locked = mounted && a.lockedUntil != null && !expired.has(a.id);
          return (
            <li key={a.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback>{a.initials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{a.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{a.email}</span>
                </div>
                <div className="ms-auto flex items-center gap-3">
                  <span className="hidden text-xs text-muted-foreground sm:inline">{a.role}</span>
                  <StatusBadge tone={locked ? "danger" : "success"}>
                    {locked ? t("statusLocked") : t("statusActive")}
                  </StatusBadge>
                </div>
              </div>

              {locked ? (
                <div className="mt-4 border-t border-border pt-4">
                  <AccountLockout
                    lockedUntil={a.lockedUntil as number}
                    canUnlock={canUnlock}
                    onUnlock={() => {
                      unlock(a.id);
                      toast.success(t("unlockedToast", { name: a.name }));
                    }}
                    onExpire={() => setExpired((prev) => new Set(prev).add(a.id))}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
