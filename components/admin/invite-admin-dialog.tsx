"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Mail, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IconInput } from "@/components/ui/icon-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MultiSelect } from "@/components/common/multi-select";
import { autoFocusSearch } from "@/lib/pointer";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/error-message";
import { useInvitableStaff, useLinkedStaffIds, useSendInvitation } from "@/lib/user-management/queries";
import { useRoles } from "@/lib/rbac/queries";
import { fetchCurrentPolicy } from "@/lib/security-policy/api";
import { inviteSchema, type InviteForm } from "@/lib/user-management/schemas";
import type { StaffRecord } from "@/lib/staff/types";

const TRIGGER = "w-full justify-between font-normal";

export function InviteAdminDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const ta = useTranslations("apiErrors");

  const [picked, setPicked] = useState<StaffRecord | null>(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffQuery, setStaffQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expiryDays, setExpiryDays] = useState<number | null>(null);

  const schema = useMemo(
    () =>
      inviteSchema({
        staffRequired: t("staffRequired"),
        emailRequired: t("emailRequired"),
        emailInvalid: t("emailInvalid"),
        roleRequired: t("roleRequired"),
      }),
    [t],
  );
  const form = useForm<InviteForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: { staffId: "", email: "", roleIds: [] },
  });
  const { register, handleSubmit, reset, setValue, formState } = form;
  const staffField = useController({ control: form.control, name: "staffId" });
  const rolesField = useController({ control: form.control, name: "roleIds" });

  const sendInvite = useSendInvitation();
  const rolesQuery = useRoles({ page: 1, perPage: 100 });
  const roleOptions = useMemo(
    () => (rolesQuery.data?.data ?? []).map((role) => ({ value: String(role.id), label: role.name })),
    [rolesQuery.data],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(staffQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [staffQuery]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchCurrentPolicy()
      .then((policy) => {
        if (alive) setExpiryDays(policy?.inviteExpiryDays ?? null);
      })
      .catch(() => void 0);
    return () => {
      alive = false;
    };
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset({ staffId: "", email: "", roleIds: [] });
      setPicked(null);
      setStaffQuery("");
      setDebouncedQuery("");
    }
    onOpenChange(next);
  };

  const staffQueryResult = useInvitableStaff(debouncedQuery, open);
  const linkedStaffQuery = useLinkedStaffIds(open);
  const shownStaff = useMemo(() => {
    const linked = new Set(linkedStaffQuery.data ?? []);
    return (staffQueryResult.data ?? []).filter((staffMember) => !linked.has(staffMember.id));
  }, [staffQueryResult.data, linkedStaffQuery.data]);

  const pickStaff = (staffMember: StaffRecord) => {
    setPicked(staffMember);
    staffField.field.onChange(staffMember.id);
    setValue("email", staffMember.email, { shouldValidate: false });
    setStaffOpen(false);
  };

  const onSubmit = async (values: InviteForm) => {
    try {
      await sendInvite.mutateAsync(values.staffId);
      toast.success(t("sentToast", { email: values.email.trim() }));
      handleOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, ta));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("inviteTitle")}</DialogTitle>
          <DialogDescription>{t("inviteDesc")}</DialogDescription>
        </DialogHeader>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className="flex flex-col gap-4">
            <Field label={t("staffLabel")} error={formState.errors.staffId?.message} reserveMessage={false}>
              <Popover open={staffOpen} onOpenChange={setStaffOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className={cn(TRIGGER, !picked && "text-muted-foreground")}
                    />
                  }
                >
                  {picked ? picked.name : t("staffPlaceholder")}
                  <ChevronsUpDown className="size-4 opacity-70" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-(--anchor-width) p-1.5">
                  <div className="relative flex items-center">
                    <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
                    <Input
                      size="sm"
                      autoFocus={autoFocusSearch()}
                      placeholder={t("staffSearchPlaceholder")}
                      value={staffQuery}
                      onChange={(event) => setStaffQuery(event.target.value)}
                      className="ps-8"
                    />
                  </div>
                  <div className="mt-1.5 max-h-56 overflow-y-auto">
                    {staffQueryResult.isLoading ? (
                      <div className="flex flex-col gap-1 p-1">
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    ) : staffQueryResult.isError ? (
                      <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
                        <p className="text-xs text-muted-foreground">{t("loadError")}</p>
                        <Button variant="outline" size="sm" onClick={() => staffQueryResult.refetch()}>
                          {tc("retry")}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {shownStaff.map((staffMember) => (
                          <button
                            key={staffMember.id}
                            type="button"
                            onClick={() => pickStaff(staffMember)}
                            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted"
                          >
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-medium">{staffMember.name}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {staffMember.email}
                              </span>
                            </span>
                            {staffMember.id === staffField.field.value && (
                              <Check className="size-4 shrink-0 text-primary" />
                            )}
                          </button>
                        ))}
                        {shownStaff.length === 0 && (
                          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                            {t("staffEmpty")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </Field>

            <Field
              label={t("emailLabel")}
              htmlFor="invite-email"
              error={formState.errors.email?.message}
              reserveMessage={false}
            >
              <IconInput
                id="invite-email"
                type="email"
                leading={<Mail className="size-4" />}
                {...register("email")}
                placeholder={t("emailPlaceholder")}
                aria-invalid={formState.errors.email ? true : undefined}
              />
            </Field>

            <Field
              label={t("rolesLabel")}
              error={formState.errors.roleIds?.message}
              hint={expiryDays == null ? t("expiryUnknown") : t("expiryNote", { days: expiryDays })}
              reserveMessage={false}
            >
              <MultiSelect
                options={roleOptions}
                value={rolesField.field.value}
                onChange={rolesField.field.onChange}
                placeholder={t("rolesPlaceholder")}
                searchPlaceholder={t("rolesSearchPlaceholder")}
                emptyLabel={t("rolesEmpty")}
              />
            </Field>

            <p className="text-xs text-muted-foreground">{t("inviteInterimNote")}</p>
          </DialogBody>
        </Form>
        <DialogFooter layout="split">
          <Button variant="outline" size="lg" onClick={() => handleOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button size="lg" onClick={handleSubmit(onSubmit)} loading={sendInvite.isPending} disabled={!picked}>
            {t("inviteSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
