"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField } from "@/components/clients/date-field";
import { useClientStore } from "@/lib/store";
import { computeAge, createClient, initialsOf } from "@/lib/clients";
import { NATIONS, REGION_NAMES } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

const usPhone = z
  .string()
  .min(1, "Enter a phone number")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(national);
  }, "Enter a valid US phone number, e.g. +1 (212) 555-0199");

const schema = z.object({
  fullName: z.string().min(2, "Enter a full name"),
  email: z.email("Enter a valid email address"),
  phone: usPhone,
  gender: z.enum(["Female", "Male"]),
  dob: z
    .string()
    .min(1, "Select a date of birth")
    .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v) <= new Date(), "Date can't be in the future"),
  nationality: z.string().min(1, "Select a nationality"),
  region: z.string().min(1, "Select a region"),
  countryRegistration: z.string().min(1, "Select a country"),
});

type FormValues = z.infer<typeof schema>;

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
  const addClient = useClientStore((s) => s.addClient);
  const updateClient = useClientStore((s) => s.updateClient);

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
    mode: "onTouched",
  });
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset(defaults);
  }, [open, defaults, reset]);

  const onSubmit = (values: FormValues) => {
    if (mode === "add") {
      const created = createClient(values);
      addClient(created);
      toast.success(`${created.fullName} added`);
    } else if (client) {
      updateClient(client.id, {
        ...values,
        age: computeAge(values.dob),
        initials: initialsOf(values.fullName),
      });
      toast.success(`${values.fullName} updated`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add client" : "Edit client"}</DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Create a new client account. Profiles can be added afterwards."
              : "Update this client's account details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.fullName?.message} className="sm:col-span-2">
            <Controller
              control={control}
              name="fullName"
              render={({ field }) => (
                <div className="relative">
                  <Input
                    className="h-9"
                    placeholder="Jane Doe"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    {...field}
                  />
                </div>
              )}
            />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <div className="relative">
                  <Input
                    type="email"
                    className="h-9"
                    placeholder="jane@mail.com"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    {...field}
                  />
                </div>
              )}
            />
          </Field>

          <Field label="Phone" error={errors.phone?.message}>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <div className="relative">
                  <Input
                    className="h-9"
                    placeholder="+1 (555) 000-0000"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    {...field}
                  />
                </div>
              )}
            />
          </Field>

          <Field label="Gender" error={errors.gender?.message}>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Date of birth" error={errors.dob?.message}>
            <Controller
              control={control}
              name="dob"
              render={({ field }) => <DateField value={field.value} onChange={field.onChange} />}
            />
          </Field>

          <Field label="Nationality" error={errors.nationality?.message}>
            <Controller
              control={control}
              name="nationality"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={NATIONS} />
              )}
            />
          </Field>

          <Field label="Region" error={errors.region?.message}>
            <Controller
              control={control}
              name="region"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={REGION_NAMES} />
              )}
            />
          </Field>

          <Field
            label="Country of registration"
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

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{mode === "add" ? "Add client" : "Save changes"}</Button>
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
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="h-9 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
