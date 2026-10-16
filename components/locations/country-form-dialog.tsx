"use client";

import { useEffect, useMemo, useRef } from "react";
import { useController, useForm } from "react-hook-form";
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
import { COUNTRY_CODE_MAX, countrySchema, type CountryForm } from "@/lib/locations/schemas";

export function CountryFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValues: CountryForm;
  submitting: boolean;
  onSubmit: (values: CountryForm) => void;
}) {
  const t = useTranslations("locations.countries");
  const tc = useTranslations("common");
  const keepArabic = mode === "edit" && initialValues.nameAr.trim() !== "";
  const schema = useMemo(
    () =>
      countrySchema(
        {
          codeRequired: t("codeRequired"),
          codeTooLong: t("codeTooLong", { max: COUNTRY_CODE_MAX }),
          codeSpaces: t("codeSpaces"),
          nameEnRequired: t("nameEnRequired"),
          nameArRequired: t("nameArRequired"),
        },
        { keepArabic },
      ),
    [keepArabic, t],
  );
  const { control, formState, handleSubmit, register, reset } = useForm<CountryForm>({
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
            <Field
              label={t("codeLabel")}
              required
              htmlFor="country-code"
              error={formState.errors.code?.message}
              reserveMessage={false}
            >
              <Input
                id="country-code"
                {...register("code")}
                placeholder={t("codePlaceholder")}
                autoComplete="off"
                className="uppercase sm:max-w-40"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("nameEnLabel")}
                required
                htmlFor="country-name-en"
                error={formState.errors.nameEn?.message}
                reserveMessage={false}
              >
                <Input id="country-name-en" {...register("nameEn")} placeholder={t("nameEnPlaceholder")} autoComplete="off" />
              </Field>
              <Field
                label={t("nameArLabel")}
                required={keepArabic}
                htmlFor="country-name-ar"
                error={formState.errors.nameAr?.message}
                hint={keepArabic ? t("nameArKept") : undefined}
                reserveMessage={false}
              >
                <Input id="country-name-ar" dir="rtl" {...register("nameAr")} autoComplete="off" />
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
