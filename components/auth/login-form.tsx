"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LockKeyhole, Loader2, Mail, MailQuestion, PauseCircle, PowerOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/lib/auth/store";

import { AccountLockout } from "@/components/common/account-lockout";
import { AuthShell } from "./auth-shell";
import { MfaStep } from "./mfa-step";
import { StatusNotice } from "./status-notice";

type View = "form" | "mfa" | "locked" | "pending" | "suspended" | "deactivated";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_DEST = "/personnel";

function safeDest(raw: string | null) {
  if (raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return raw;
  return DEFAULT_DEST;
}

export function LoginForm({ returnTo }: { returnTo?: string | null }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const attempt = useAuthStore((state) => state.attempt);

  const [view, setView] = useState<View>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [credError, setCredError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);

  const pwRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  const goToDest = useCallback(() => {
    toast.success(t("signedIn"));
    router.replace(safeDest(returnTo ?? null));
  }, [router, returnTo, t]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setCredError(false);
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError(true);
      emailRef.current?.focus();
      return;
    }
    setEmailError(false);
    setBusy(true);
    const outcome = await attempt(email, password, remember);
    setBusy(false);

    switch (outcome.result) {
      case "SUCCESS":
        goToDest();
        break;
      case "MFA_REQUIRED":
        setView("mfa");
        break;
      case "INVALID_CREDENTIALS":
        setCredError(true);
        pwRef.current?.focus();
        break;
      case "ACCOUNT_LOCKED":
        setLockedUntil(outcome.lockedUntil ?? Date.now());
        setView("locked");
        break;
      case "ACCOUNT_PENDING":
        setView("pending");
        break;
      case "ACCOUNT_SUSPENDED":
        setView("suspended");
        break;
      case "ACCOUNT_DEACTIVATED":
        setView("deactivated");
        break;
      case "SERVER_ERROR":
        toast.error(t("serverError"));
        break;
    }
  };

  const backToForm = () => {
    setView("form");
    setCredError(false);
    setPassword("");
  };

  if (view === "mfa") {
    return (
      <AuthShell title={t("mfaTitle")} animationKey={view} align="center">
        <MfaStep email={email} remember={remember} onVerified={goToDest} onBack={backToForm} />
      </AuthShell>
    );
  }

  if (view === "locked") {
    return (
      <AuthShell animationKey={view}>
        <AccountLockout lockedUntil={lockedUntil} onExpire={backToForm} onBack={backToForm} />
      </AuthShell>
    );
  }

  if (view === "pending") {
    return (
      <AuthShell animationKey={view}>
        <StatusNotice
          icon={<MailQuestion className="size-5" />}
          title={t("pendingTitle")}
          body={t("pendingBody")}
          onBack={backToForm}
          support
        />
      </AuthShell>
    );
  }

  if (view === "suspended") {
    return (
      <AuthShell animationKey={view}>
        <StatusNotice
          icon={<PauseCircle className="size-5" />}
          title={t("suspendedTitle")}
          body={t("suspendedBody")}
          onBack={backToForm}
          tone="danger"
          support
        />
      </AuthShell>
    );
  }

  if (view === "deactivated") {
    return (
      <AuthShell animationKey={view}>
        <StatusNotice
          icon={<PowerOff className="size-5" />}
          title={t("deactivatedTitle")}
          body={t("deactivatedBody")}
          onBack={backToForm}
          tone="danger"
          support
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      animationKey={view}
      footer={
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5" />
          {t("securedNote")}
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label={t("email")}
          htmlFor="email"
          reserveMessage={false}
          error={emailError ? t("invalidEmail") : undefined}
        >
          <div className="relative flex items-center">
            <Mail className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
            <Input
              id="email"
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              data-1p-ignore
              data-lpignore="true"
              placeholder={t("emailPlaceholder")}
              value={email}
              className="ps-8"
              aria-invalid={emailError || undefined}
              aria-describedby={emailError ? "email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError(false);
              }}
              onBlur={() => {
                if (email.trim() && !EMAIL_RE.test(email.trim())) setEmailError(true);
              }}
            />
          </div>
        </Field>

        <Field
          label={t("password")}
          htmlFor="password"
          reserveMessage={false}
          error={credError ? t("invalidCredentials") : undefined}
        >
          <PasswordInput
            id="password"
            inputRef={pwRef}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            autoComplete="current-password"
            required
            data-1p-ignore
            data-lpignore="true"
            placeholder={t("passwordPlaceholder")}
            value={password}
            aria-invalid={credError || undefined}
            aria-describedby={credError ? "password-error" : undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              if (credError) setCredError(false);
            }}
          />
        </Field>

        <Label htmlFor="remember" className="cursor-pointer items-start gap-2.5 font-normal">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(checked) => setRemember(checked)}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium leading-none">{t("rememberDevice")}</span>
            <span className="text-xs text-muted-foreground">{t("rememberHelp")}</span>
          </span>
        </Label>

        <Button type="submit" disabled={!canSubmit} aria-busy={busy} size="xl" className="mt-1 w-full">
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              {t("signingIn")}
            </>
          ) : (
            t("signIn")
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
