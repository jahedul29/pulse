"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProfileCell } from "@/components/common/profile-cell";
import { RecordLink } from "@/components/common/record-link";
import { UserAccessEditor } from "@/components/admin/user-access-editor";
import { recordHref } from "@/lib/record-links";
import { cn } from "@/lib/utils";
import { autoFocusSearch } from "@/lib/pointer";
import { useAdminUsers } from "@/lib/user-management/queries";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import type { AdminUserRow } from "@/lib/user-management/types";
import { PageContainer } from "@/components/common/page-container";

const TRIGGER = "w-full justify-between font-normal";

export function AdminAccess() {
  const t = useTranslations("rbac");
  const tc = useTranslations("common");
  const canEdit = useHasPermission(PERMISSIONS.USER_MANAGEMENT_EDIT);

  const [pickedAdmin, setPickedAdmin] = useState<AdminUserRow | null>(null);
  const adminId = pickedAdmin?.id ?? "";
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");

  const adminsQuery = useAdminUsers({ page: 1, perPage: 100 });
  const adminResults = useMemo(() => {
    const term = adminSearch.trim().toLowerCase();
    const rows = (adminsQuery.data?.data ?? []).filter(
      (admin) => !term || admin.name.toLowerCase().includes(term) || admin.email.toLowerCase().includes(term),
    );
    if (!pickedAdmin) return rows;
    return [pickedAdmin, ...rows.filter((admin) => admin.id !== pickedAdmin.id)];
  }, [adminsQuery.data, pickedAdmin, adminSearch]);

  const pickAdmin = (admin: AdminUserRow) => {
    setPickedAdmin(admin);
    setAdminOpen(false);
  };

  return (
    <PageContainer variant="form" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("accessTitle")}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{t("accessSubtitle")}</p>
      </header>

      <Card>
        <CardContent>
          <Field label={t("selectAdmin")} reserveMessage={false}>
            <Popover open={adminOpen} onOpenChange={setAdminOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={cn(TRIGGER, "sm:w-80", !pickedAdmin && "text-muted-foreground")}
                  />
                }
              >
                {pickedAdmin ? pickedAdmin.name : t("selectAdminPlaceholder")}
                <ChevronsUpDown className="size-4 opacity-70" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--anchor-width) p-1.5 sm:w-80">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
                  <Input
                    size="sm"
                    autoFocus={autoFocusSearch()}
                    placeholder={t("adminSearch")}
                    value={adminSearch}
                    onChange={(event) => setAdminSearch(event.target.value)}
                    className="ps-8"
                  />
                </div>
                <div className="mt-1.5 max-h-64 overflow-y-auto">
                  {adminsQuery.isPending ? (
                    <div className="flex flex-col gap-1 p-1">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ) : adminsQuery.isError ? (
                    <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
                      <p className="text-xs text-muted-foreground">{t("loadError")}</p>
                      <Button variant="outline" size="sm" onClick={() => adminsQuery.refetch()}>
                        {tc("retry")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {adminResults.map((admin) => (
                        <button
                          key={admin.id}
                          type="button"
                          onClick={() => pickAdmin(admin)}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{admin.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
                          </span>
                          {admin.id === adminId && <Check className="size-4 shrink-0 text-primary" />}
                        </button>
                      ))}
                      {adminResults.length === 0 && (
                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("noAdmins")}</p>
                      )}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </Field>
        </CardContent>
      </Card>

      {!pickedAdmin ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">{t("noAdmin")}</CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <RecordLink
              href={recordHref("adminAccount", pickedAdmin.id)}
              label={t("openAccount", { name: pickedAdmin.name })}
            >
              <ProfileCell name={pickedAdmin.name} initials={pickedAdmin.initials} subtitle={pickedAdmin.email} />
            </RecordLink>
          </div>
          <UserAccessEditor userId={pickedAdmin.id} userName={pickedAdmin.name} variant="page" canEdit={canEdit} />
        </>
      )}
    </PageContainer>
  );
}
