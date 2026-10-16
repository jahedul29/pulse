"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { AlertCircle, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

function RequiredMark() {
  const t = useTranslations("common")
  return (
    <>
      <span aria-hidden="true" className="ms-0.5 text-danger">
        *
      </span>
      <span className="sr-only">{t("required")}</span>
    </>
  )
}

function Field({
  label,
  htmlFor,
  required = false,
  error,
  success,
  hint,
  reserveMessage = true,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  success?: string
  hint?: string
  reserveMessage?: boolean
  className?: string
  children: React.ReactNode
}) {
  const message = error ? (
    <p
      id={htmlFor ? `${htmlFor}-error` : undefined}
      role="alert"
      className="flex items-center gap-1 font-medium text-danger"
    >
      <AlertCircle className="size-3.5 shrink-0" /> {error}
    </p>
  ) : success ? (
    <p className="flex items-center gap-1 font-medium text-success">
      <Check className="size-3.5 shrink-0" /> {success}
    </p>
  ) : hint ? (
    <p className="text-muted-foreground">{hint}</p>
  ) : null

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        <span>
          {label}
          {required && <RequiredMark />}
        </span>
      </Label>
      {children}
      {reserveMessage ? (
        <div className="min-h-4 text-xs leading-4">{message}</div>
      ) : message ? (
        <div className="text-xs leading-4">{message}</div>
      ) : null}
    </div>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-1 text-xs leading-4 font-medium text-danger"
    >
      <AlertCircle className="size-3.5 shrink-0" /> {children}
    </p>
  )
}

export { Field, FieldError, RequiredMark }
