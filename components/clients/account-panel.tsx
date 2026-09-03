"use client";

import { Bell, CreditCard, NotebookPen, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, StatusDot, accountTone } from "@/components/common/status-badge";
import { fmtDate } from "@/lib/format";
import { Money } from "@/components/common/money";
import type { Client } from "@/lib/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function AccountPanel({ client }: { client: Client }) {
  const t = useTranslations("clients");
  const locale = useLocale();
  const wallet = client.wallet;
  const unread = client.notifications.filter((notification) => !notification.read).length;
  return (
    <div className="flex flex-col gap-4">
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-accent text-lg font-semibold text-accent-foreground">
              {client.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{client.fullName}</CardTitle>
              <StatusBadge tone={accountTone(client.status)}>
                {t(`status.${client.status}`)}
              </StatusBadge>
              {client.activePackage && (
                <StatusBadge tone="neutral">{t("account.activePackage")}</StatusBadge>
              )}
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {client.refCode} · {client.systemId} ·{" "}
              {client.signedIn ? t("account.signedIn") : t("account.signedOut")}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label={t("account.email")} value={client.email} />
            <Field label={t("account.phone")} value={<span className="font-mono">{client.phone}</span>} />
            <Field
              label={t("account.altPhone")}
              value={<span className="font-mono">{client.altPhone ?? "—"}</span>}
            />
            <Field
              label={t("account.dob")}
              value={t("account.dobValue", { date: fmtDate(client.dob, locale), age: client.age })}
            />
            <Field label={t("account.nationality")} value={client.nationality} />
            <Field label={t("account.region")} value={client.region} />
            <Field label={t("account.residence")} value={client.countryResidence} />
            <Field label={t("account.registration")} value={client.countryRegistration} />
            <Field label={t("account.joined")} value={fmtDate(client.joinedAt, locale)} />
            <Field
              label={t("account.biometrics")}
              value={client.biometrics ? t("account.enabled") : t("account.disabled")}
            />
            <Field
              label={t("account.policies")}
              value={
                <StatusBadge tone={client.policiesAccepted ? "success" : "warning"}>
                  {client.policiesAccepted ? t("account.accepted") : t("account.pending")}
                </StatusBadge>
              }
            />
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4 text-primary" />
              {t("account.wallet")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Money value={wallet.balance} className="font-heading text-3xl font-semibold" />
              <div className="text-end text-xs text-muted-foreground">
                <div>{t("account.bonus")} <Money value={wallet.bonus} /></div>
                <div>{t("account.gift")} <Money value={wallet.gift} /></div>
                <div>{t("account.forfeit")} <Money value={wallet.forfeit} /></div>
              </div>
            </div>
            <div className="border-t pt-2">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">
                {t("account.recentTransactions")}
              </span>
              <ul className="mt-1.5 flex flex-col gap-1">
                {wallet.transactions.slice(0, 4).map((t, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t.kind}
                      <span className="ms-2 font-mono text-xs">{fmtDate(t.date, locale)}</span>
                    </span>
                    <Money value={t.amount} className="font-mono" />
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-primary" />
              {t("account.bankCards")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {client.bankCards.map((card, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{card.brand}</span>
                  <span className="font-mono text-muted-foreground">•••• {card.last4}</span>
                </span>
                {card.isDefault && <StatusBadge tone="success">{t("account.default")}</StatusBadge>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-primary" />
              {t("account.notifications")}
              {unread > 0 && (
                <StatusBadge tone="warning">{t("account.unread", { count: unread })}</StatusBadge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {client.notifications.map((notification, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <StatusDot tone={notification.read ? "neutral" : "warning"} />
                <div className="min-w-0 flex-1">
                  <p className={notification.read ? "text-muted-foreground" : "text-foreground"}>{notification.text}</p>
                  <span className="font-mono text-xs text-muted-foreground">{fmtDate(notification.date, locale)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <NotebookPen className="size-4 text-primary" />
              {t("account.adminNotes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {client.adminNotes.map((note, i) => (
              <div key={i} className="border-s-2 border-border ps-3 text-sm">
                <p>{note.text}</p>
                <span className="font-mono text-xs text-muted-foreground">
                  {note.adminName} · {note.adminId} · {fmtDate(note.date, locale)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
