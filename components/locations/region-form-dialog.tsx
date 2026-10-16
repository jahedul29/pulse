"use client";

import { useEffect, useMemo, useRef } from "react";
import { Controller, useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { SwitchField } from "@/components/common/switch-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGION_CODE_MAX, regionSchema, type RegionForm } from "@/lib/locations/schemas";
import type { CountryOption } from "./use-country-options";

export function RegionFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  countryOptions,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValues: RegionForm;
  countryOptions: CountryOption[];
  submitting: boolean;
  onSubmit: (values: RegionForm) => void;
}) {
  const t = useTranslations("locations.regions");
  const tc = useTranslations("common");
  const keepArabic = mode === "edit" && initialValues.nameAr.trim() !== "";
  const schema = useMemo(
    () =>
      regionSchema(
        {
          countryRequired: t("countryRequired"),
          codeTooLong: t("codeTooLong", { max: REGION_CODE_MAX }),
          codeCharacters: t("codeCharacters"),
          nameEnRequired: t("nameEnRequired"),
          nameArRequired: t("nameArRequired"),
        },
        { keepArabic },
      ),
    [keepArabic, t],
  );
  const { control, formState, handleSubmit, register, reset } = useForm<RegionForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: initialValues,
  });
  const activeField = useController({ control, name: "isActive" });

  const initialValuesRef = useRef(initialValues);

  useEffect(() => {
    initialValuesRef.current = initialValues;
  });

  useEffect(() => {
    if (open) reset(initialValuesRef.current);
  }, [open, reset]);

  const submit = handleSubmit((values) => {
    if (!submitting) onSubmit(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? t("editTitle") : t("createTitle")}</DialogTitle>
          {mode === "create" ? <DialogDescription>{t("createDesc")}</DialogDescription> : null}
        </DialogHeader>
        <Form onSubmit={submit}>
          <DialogBody className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("countryLabel")}
                required
                htmlFor="region-country"
                error={formState.errors.countryId?.message}
                reserveMessage={false}
              >
                <Controller
                  control={control}
                  name="countryId"
                  render={({ field }) => (
                    <Select value={field.value || null} onValueChange={(value) => field.onChange(value ?? "")}>
                      <SelectTrigger id="region-country" className="w-full" aria-invalid={Boolean(formState.errors.countryId)}>
                        <SelectValue>
                          {(value) =>
                            countryOptions.find((option) => String(option.id) === value)?.label ?? (
                              <span className="text-muted-foreground">{t("countryPlaceholder")}</span>
                            )
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((option) => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label={t("codeLabel")} htmlFor="region-code" error={formState.errors.code?.message} reserveMessage={false}>
                <Input id="region-code" {...register("code")} placeholder={t("codePlaceholder")} autoComplete="off" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("nameEnLabel")}
                required
                htmlFor="region-name-en"
                error={formState.errors.nameEn?.message}
                reserveMessage={false}
              >
                <Input id="region-name-en" {...register("nameEn")} placeholder={t("nameEnPlaceholder")} autoComplete="off" />
              </Field>
              <Field
                label={t("nameArLabel")}
                required={keepArabic}
                htmlFor="region-name-ar"
                error={formState.errors.nameAr?.message}
                hint={keepArabic ? t("nameArKept") : undefined}
                reserveMessage={false}
              >
                <Input id="region-name-ar" dir="rtl" {...register("nameAr")} autoComplete="off" />
              </Field>
            </div>
            <SwitchField
              label={t("activeLabel")}
              checked={activeField.field.value}
              onCheckedChange={activeField.field.onChange}
              description={t("activeHint")}
            />
          </DialogBody>
        </Form>
        <DialogFooter layout="split">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button size="lg" onClick={submit} loading={submitting} disabled={mode === "edit" && !formState.isDirty}>
            {mode === "edit" ? t("save") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
