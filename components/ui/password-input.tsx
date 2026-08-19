"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

function PasswordInput({
  className,
  showLabel = "Show password",
  hideLabel = "Hide password",
  inputRef,
  ...props
}: React.ComponentProps<typeof Input> & {
  showLabel?: string
  hideLabel?: string
  inputRef?: React.Ref<HTMLInputElement>
}) {
  const [show, setShow] = React.useState(false)
  return (
    <div className="relative flex items-center">
      <Input
        ref={inputRef}
        type={show ? "text" : "password"}
        className={cn("pe-9", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? hideLabel : showLabel}
        aria-pressed={show}
        className="absolute end-2 top-1/2 grid -translate-y-1/2 place-items-center rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }
