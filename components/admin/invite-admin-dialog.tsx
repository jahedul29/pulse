"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useController, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Mail, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
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
import { useUserStore } from "@/lib/user-management/store";
import { useAuthStore } from "@/lib/auth/store";
import { fetchUnlinkedStaff, adminEmailExists } from "@/lib/user-management/api";
import { fetchCurrentPolicy } from "@/lib/security-policy/api";
import { fetchRoles } from "@/lib/rbac/api";
import { inviteSchema, type InviteForm } from "@/lib/user-management/schemas";
import type { StaffRecord } from "@/lib/staff/types";
import type { Role } from "@/lib/rbac/types";

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

  const invite = useUserStore((state) => state.invite);
  const users = useUserStore((state) => state.users);
  const actorName = useAuthStore((state) => state.session?.name ?? "You");

  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffQuery, setStaffQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const schema = useMemo(
    () =>
      inviteSchema(
        {
          staffRequired: t("staffRequired"),
          emailRequired: t("emailRequired"),
          emailInvalid: t("emailInvalid"),
          emailExists: t("emailExists"),
          roleRequired: t("roleRequired"),
        },
        { existingEmails: users.filter((user) => user.status !== "revoked").map((user) => user.email) },
      ),
    [t, users],
  );

  const form = useForm<InviteForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: { staffId: "", email: "", roleIds: [] },
  });
  const { register, handleSubmit, reset, setValue, formState } = form;
  const staffField = useController({ control: form.control, name: "staffId" });
  const rolesField = useController({ control: form.control, name: "roleIds" });
  const email = useWatch({ control: form.control, name: "email" }) ?? "";

  useEffect(() => {
    if (!open) return;
    let alive = true;
    reset({ staffId: "", email: "", roleIds: [] });
    Promise.all([fetchUnlinkedStaff(), fetchRoles(), fetchCurrentPolicy()])
      .then(([staffList, roleList, policy]) => {
        if (!alive) return;
        setStaff(staffList);
        setRoles(roleList);
        setExpiryDays(policy?.inviteExpiryDays ?? null);
        setStaffQuery("");
        setEmailTaken(false);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
      setLoaded(false);
      setLoadError(false);
    };
  }, [open, attempt, reset]);

  useEffect(() => {
    const value = email.trim();
    const timer = setTimeout(() => {
      if (!value) setEmailTaken(false);
      else adminEmailExists(value).then(setEmailTaken);
    }, 400);
    return () => clearTimeout(timer);
  }, [email]);

  const selectedStaff = staff.find((staffMember) => staffMember.id === staffField.field.value);
  const roleOptions = useMemo(() => roles.map((role) => ({ value: role.id, label: role.name })), [roles]);

  const shownStaff = staff.filter(
    (staffMember) =>
      staffMember.name.toLowerCase().includes(staffQuery.trim().toLowerCase()) ||
      staffMember.email.toLowerCase().includes(staffQuery.trim().toLowerCase()),
  );

  const pickStaff = (staffMember: StaffRecord) => {
    staffField.field.onChange(staffMember.id);
    setValue("email", staffMember.email, { shouldValidate: false });
    setStaffOpen(false);
  };

  const onSubmit = (values: InviteForm) => {
    if (emailTaken || !selectedStaff) return;
    invite({
      staffId: values.staffId,
      name: selectedStaff.name,
      email: values.email.trim(),
      initials: selectedStaff.initials,
      roleIds: values.roleIds,
      by: actorName,
    });
    toast.success(t("sentToast", { email: values.email.trim() }));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("inviteTitle")}</DialogTitle>
          <DialogDescription>{t("inviteDesc")}</DialogDescription>
        </DialogHeader>
        <Form onSubmit={handleSubmit(onSubmit)}>
        <DialogBody className="flex flex-col gap-4">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{t("loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => setAttempt((previous) => previous + 1)}>
                {tc("retry")}
              </Button>
            </div>
          ) : !loaded ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <>
          <Field label={t("staffLabel")} error={formState.errors.staffId?.message} reserveMessage={false}>
            <Popover open={staffOpen} onOpenChange={setStaffOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={cn(TRIGGER, !selectedStaff && "text-muted-foreground")}
                  />
                }
              >
                {selectedStaff ? selectedStaff.name : t("staffPlaceholder")}
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
                            {staffMember.title} · {staffMember.email}
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
              aria-invalid={formState.errors.email || emailTaken ? true : undefined}
            />
            {emailTaken && !formState.errors.email && <FieldError>{t("emailExists")}</FieldError>}
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
            </>
          )}
        </DialogBody>
        </Form>
        <DialogFooter layout="split">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button size="lg" onClick={handleSubmit(onSubmit)} disabled={emailTaken || !loaded}>
            {t("inviteSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
