"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  label,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { label?: React.ReactNode }) {
  const box = (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox peer grid size-4 shrink-0 place-items-center rounded-[4px] border border-border-strong bg-transparent outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground data-[indeterminate]:border-primary data-[indeterminate]:bg-primary data-[indeterminate]:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3 group-data-[indeterminate]/checkbox:hidden" strokeWidth={3} />
        <Minus className="hidden size-3 group-data-[indeterminate]/checkbox:block" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )

  if (label == null) return box

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
      {box}
      {label}
    </label>
  )
}

export { Checkbox }
