import { Bell, CreditCard, NotebookPen, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ACCOUNT_STATUS_LABEL,
  StatusBadge,
  StatusDot,
  accountTone,
} from "@/components/common/status-badge";
import { fmtDate, fmtMoney } from "@/lib/format";
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
  const w = client.wallet;
  const unread = client.notifications.filter((n) => !n.read).length;
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
                {ACCOUNT_STATUS_LABEL[client.status]}
              </StatusBadge>
              {client.activePackage && (
                <StatusBadge tone="neutral">Active package</StatusBadge>
              )}
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {client.refCode} · {client.systemId} · {client.signedIn ? "Signed in" : "Signed out"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Email" value={client.email} />
            <Field label="Phone" value={<span className="font-mono">{client.phone}</span>} />
            <Field
              label="Alt phone"
              value={<span className="font-mono">{client.altPhone ?? "—"}</span>}
            />
            <Field label="Date of birth" value={`${fmtDate(client.dob)} · ${client.age} yrs`} />
            <Field label="Nationality" value={client.nationality} />
            <Field label="Region" value={client.region} />
            <Field label="Residence" value={client.countryResidence} />
            <Field label="Registration" value={client.countryRegistration} />
            <Field label="Joined" value={fmtDate(client.joinedAt)} />
            <Field
              label="Biometrics"
              value={client.biometrics ? "Enabled" : "Disabled"}
            />
            <Field
              label="Policies"
              value={
                <StatusBadge tone={client.policiesAccepted ? "success" : "warning"}>
                  {client.policiesAccepted ? "Accepted" : "Pending"}
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
              Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="font-heading text-3xl font-semibold tabular">
                {fmtMoney(w.balance)}
              </span>
              <div className="text-right text-xs text-muted-foreground">
                <div>Bonus {fmtMoney(w.bonus)}</div>
                <div>Gift {fmtMoney(w.gift)}</div>
                <div>Forfeit {fmtMoney(w.forfeit)}</div>
              </div>
            </div>
            <div className="border-t pt-2">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">
                Recent transactions
              </span>
              <ul className="mt-1.5 flex flex-col gap-1">
                {w.transactions.slice(0, 4).map((t, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t.kind}
                      <span className="ml-2 font-mono text-xs">{fmtDate(t.date)}</span>
                    </span>
                    <span className="font-mono tabular">{fmtMoney(t.amount)}</span>
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
              Bank cards
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {client.bankCards.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{c.brand}</span>
                  <span className="font-mono text-muted-foreground">•••• {c.last4}</span>
                </span>
                {c.isDefault && <StatusBadge tone="success">Default</StatusBadge>}
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
              Notifications
              {unread > 0 && <StatusBadge tone="warning">{unread} unread</StatusBadge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {client.notifications.map((n, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <StatusDot tone={n.read ? "neutral" : "warning"} />
                <div className="min-w-0 flex-1">
                  <p className={n.read ? "text-muted-foreground" : "text-foreground"}>{n.text}</p>
                  <span className="font-mono text-xs text-muted-foreground">{fmtDate(n.date)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <NotebookPen className="size-4 text-primary" />
              Admin notes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {client.adminNotes.map((note, i) => (
              <div key={i} className="border-l-2 border-border pl-3 text-sm">
                <p>{note.text}</p>
                <span className="font-mono text-xs text-muted-foreground">
                  {note.adminName} · {note.adminId} · {fmtDate(note.date)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
