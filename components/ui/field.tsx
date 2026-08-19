import * as React from "react"
import { AlertCircle, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

function Field({
  label,
  htmlFor,
  error,
  success,
  hint,
  reserveMessage = true,
  className,
  children,
}: {
  label: string
  htmlFor?: string
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
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {reserveMessage ? (
        <div className="min-h-4 text-xs leading-4">{message}</div>
      ) : message ? (
        <div className="text-xs leading-4">{message}</div>
      ) : null}
    </div>
  )
}

export { Field }
