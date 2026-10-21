"use client"

import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const t = useTranslations("common")

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      richColors
      closeButton
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        closeButtonAriaLabel: t("close"),
        classNames: {
          toast:
            "cn-toast !pe-11 [--toast-close-button-start:auto] [--toast-close-button-end:0.5rem] [--toast-close-button-transform:translateY(-50%)] rtl:[--toast-close-button-start:0.5rem] rtl:[--toast-close-button-end:auto]",
          closeButton:
            "!top-1/2 !size-7 !rounded-md !border-0 !bg-transparent !text-current opacity-70 transition-opacity hover:opacity-100 hover:!bg-current/10 [&>svg]:!size-3.5",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
