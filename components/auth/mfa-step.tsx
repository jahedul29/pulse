"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { OTPField } from "@base-ui/react/otp-field";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth/store";
import { MFA_CODE } from "@/lib/auth/mock";
import { cn } from "@/lib/utils";

const LEN = 6;

export function MfaStep({
  email,
  remember,
  onVerified,
  onBack,
}: {
  email: string;
  remember: boolean;
  onVerified: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("auth");
  const verify = useAuthStore((s) => s.verify);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const submitting = useRef(false);

  const submit = useCallback(
    async (value: string) => {
      if (submitting.current || value.length < LEN) return;
      submitting.current = true;
      setBusy(true);
      setError(false);
      const outcome = await verify(email, value, remember);
      submitting.current = false;
      setBusy(false);
      if (outcome.result === "SUCCESS") {
        onVerified();
      } else {
        setError(true);
        setShake(true);
        setCode("");
      }
    },
    [email, remember, verify, onVerified],
  );

  return (
    <div className="flex flex-col gap-5 animate-in fade-in-0 duration-200">
      <p className="text-sm text-center text-muted-foreground text-pretty">
        {t.rich("mfaSubtitle", {
          email,
          em: (chunks) => <span className="font-medium text-primary">{chunks}</span>,
        })}
      </p>

      <OTPField.Root
        length={LEN}
        value={code}
        autoComplete="one-time-code"
        onValueChange={(value) => {
          setError(false);
          setCode(value);
          if (value.length === LEN) submit(value);
        }}
        aria-label={t("mfaCodeLabel")}
        aria-invalid={error || undefined}
        aria-describedby={error ? "mfa-error" : undefined}
        className={cn("flex justify-between gap-2", shake && "animate-rule-shake")}
        onAnimationEnd={() => setShake(false)}
      >
        {Array.from({ length: LEN }, (_, i) => (
          <OTPField.Input
            key={i}
            disabled={busy}
            className={cn(
              "tabular h-12 w-full rounded-lg border border-input bg-transparent text-center font-mono text-lg outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring/60",
              "disabled:opacity-50",
              error && "border-destructive ring-1 ring-destructive/30",
            )}
          />
        ))}
      </OTPField.Root>

      {error ? (
        <p id="mfa-error" role="alert" className="-mt-2 text-sm font-medium text-danger">
          {t("mfaWrongCode")}
        </p>
      ) : (
        <p className="-mt-2 text-xs text-muted-foreground text-center">
          {t("mfaDemoHint", { code: MFA_CODE })}
        </p>
      )}

      <Button
        type="button"
        onClick={() => submit(code)}
        disabled={busy || code.length < LEN}
        aria-busy={busy}
        size="xl"
        className="w-full"
      >
        {busy ? (
          <>
            <Loader2 className="animate-spin" />
            {t("verifying")}
          </>
        ) : (
          <>
            <ShieldCheck />
            {t("verify")}
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={busy}
        className="mx-auto text-muted-foreground"
      >
        <ArrowLeft className="rtl:-scale-x-100" />
        {t("backToSignIn")}
      </Button>
    </div>
  );
}
