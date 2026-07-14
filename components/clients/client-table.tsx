"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ACCOUNT_STATUS_LABEL, StatusBadge, accountTone } from "@/components/common/status-badge";
import { Pagination } from "@/components/common/pagination";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { useClientStore } from "@/lib/store";
import { fmtDate, fmtMoney } from "@/lib/format";

const PAGE_SIZE = 8;

export function ClientTable() {
  const router = useRouter();
  const clients = useClientStore((s) => s.clients);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [prevQuery, setPrevQuery] = useState(query);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.fullName, c.email, c.refCode, c.region].some((f) => f.toLowerCase().includes(q)),
    );
  }, [query, clients]);

  if (query !== prevQuery) {
    setPrevQuery(query);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const startIndex = (current - 1) * PAGE_SIZE;
  const visible = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex w-full max-w-sm items-center">
          <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, code or region"
            className="h-9 w-full rounded-lg border bg-card pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </label>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          New client
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Client</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Profiles</TableHead>
              <TableHead className="text-right">Wallet</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((c) => (
              <TableRow
                key={c.id}
                onClick={() => router.push(`/clients/${c.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/clients/${c.id}`);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`Open ${c.fullName}`}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
                        {c.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="block truncate font-medium">{c.fullName}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {c.refCode}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.region}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge tone={accountTone(c.status)}>
                      {ACCOUNT_STATUS_LABEL[c.status]}
                    </StatusBadge>
                    {c.activePackage && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        pkg
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono tabular">{c.profiles.length}</TableCell>
                <TableCell className="text-right font-mono tabular">
                  {fmtMoney(c.wallet.balance)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular text-muted-foreground">
                  {fmtDate(c.joinedAt)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No clients match “{query}”.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={current}
        pageCount={pageCount}
        total={filtered.length}
        start={filtered.length === 0 ? 0 : startIndex + 1}
        end={Math.min(startIndex + PAGE_SIZE, filtered.length)}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
        label="clients"
      />

      <ClientFormDialog mode="add" open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
