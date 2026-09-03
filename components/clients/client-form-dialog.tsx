"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField } from "@/components/clients/date-field";
import { Field } from "@/components/ui/field";
import { useClientStore } from "@/lib/store";
import { computeAge, createClient, initialsOf } from "@/lib/clients";
import { NATIONS, REGION_NAMES } from "@/lib/mock/data";
import type { Client } from "@/lib/types";

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  gender: "Female" | "Male";
  dob: string;
  nationality: string;
  region: string;
  countryRegistration: string;
};

function isValidUsPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(national);
}

const EMPTY: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  gender: "Female",
  dob: "",
  nationality: "United States",
  region: REGION_NAMES[0],
  countryRegistration: "United States",
};

export function ClientFormDialog({
  mode,
  client,
  open,
  onOpenChange,
}: {
  mode: "add" | "edit";
  client?: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("clients.form");
  const tc = useTranslations("common");
  const addClient = useClientStore((state) => state.addClient);
  const updateClient = useClientStore((state) => state.updateClient);

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(2, t("vName")),
        email: z.email(t("vEmail")),
        phone: z.string().min(1, t("vPhoneRequired")).refine(isValidUsPhone, t("vPhoneInvalid")),
        gender: z.enum(["Female", "Male"]),
        dob: z
          .string()
          .min(1, t("vDobRequired"))
          .refine(
            (value) => !Number.isNaN(Date.parse(value)) && new Date(value) <= new Date(),
            t("vDobFuture"),
          ),
        nationality: z.string().min(1, t("vNationality")),
        region: z.string().min(1, t("vRegion")),
        countryRegistration: z.string().min(1, t("vCountry")),
      }),
    [t],
  );

  const defaults = useMemo<FormValues>(
    () =>
      client
        ? {
            fullName: client.fullName,
            email: client.email,
            phone: client.phone,
            gender: client.gender,
            dob: client.dob,
            nationality: client.nationality,
            region: client.region,
            countryRegistration: client.countryRegistration,
          }
        : EMPTY,
    [client],
  );

  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset(defaults);
  }, [open, defaults, reset]);

  const onSubmit = (values: FormValues) => {
    if (mode === "add") {
      const created = createClient(values);
      addClient(created);
      toast.success(t("addedToast", { name: created.fullName }));
    } else if (client) {
      updateClient(client.id, {
        ...values,
        age: computeAge(values.dob),
        initials: initialsOf(values.fullName),
      });
      toast.success(t("updatedToast", { name: values.fullName }));
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? t("addTitle") : t("editTitle")}</DialogTitle>
          <DialogDescription>{mode === "add" ? t("addDesc") : t("editDesc")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="grid gap-4 sm:grid-cols-2">
          <Field reserveMessage={false} label={t("fullName")} error={errors.fullName?.message} className="sm:col-span-2">
            <Controller
              control={control}
              name="fullName"
              render={({ field }) => (
                <div className="relative">
                  <Input
                    className="h-9"
                    placeholder={t("phName")}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    {...field}
                  />
                </div>
              )}
            />
          </Field>

          <Field reserveMessage={false} label={t("email")} error={errors.email?.message}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <div className="relative">
                  <Input
                    type="email"
                    dir="ltr"
                    className="h-9 text-start"
                    placeholder={t("phEmail")}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    {...field}
                  />
                </div>
              )}
            />
          </Field>

          <Field reserveMessage={false} label={t("phone")} error={errors.phone?.message}>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <div className="relative">
                  <Input
                    dir="ltr"
                    className="h-9 text-start"
                    placeholder={t("phPhone")}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    {...field}
                  />
                </div>
              )}
            />
          </Field>

          <Field reserveMessage={false} label={t("gender")} error={errors.gender?.message}>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value) => (value === "Male" ? t("genderMale") : t("genderFemale"))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Female">{t("genderFemale")}</SelectItem>
                    <SelectItem value="Male">{t("genderMale")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field reserveMessage={false} label={t("dob")} error={errors.dob?.message}>
            <Controller
              control={control}
              name="dob"
              render={({ field }) => <DateField value={field.value} onChange={field.onChange} />}
            />
          </Field>

          <Field reserveMessage={false} label={t("nationality")} error={errors.nationality?.message}>
            <Controller
              control={control}
              name="nationality"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={NATIONS} />
              )}
            />
          </Field>

          <Field reserveMessage={false} label={t("region")} error={errors.region?.message}>
            <Controller
              control={control}
              name="region"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={REGION_NAMES} />
              )}
            />
          </Field>

          <Field
            label={t("country")}
            error={errors.countryRegistration?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="countryRegistration"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={NATIONS} />
              )}
            />
          </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit">{mode === "add" ? t("addBtn") : t("saveChanges")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

