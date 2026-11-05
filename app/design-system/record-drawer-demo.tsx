"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/data-table";
import { DateTimeValue } from "@/components/common/date-time-value";
import { DetailList } from "@/components/common/detail-list";
import { DetailSection } from "@/components/common/detail-section";
import { DiffLegend, DiffViewer } from "@/components/common/diff-viewer";
import { FieldsJsonPanel } from "@/components/common/fields-json-panel";
import { HashValue } from "@/components/common/hash-value";
import { HiddenValue } from "@/components/common/hidden-value";
import { ProfileCell } from "@/components/common/profile-cell";
import { RecordDrawerHeader } from "@/components/common/record-drawer-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Sheet, SheetBody, SheetContent } from "@/components/ui/sheet";
import { fmtDateTime } from "@/lib/format";
import { columnWidth } from "@/lib/table/column-widths";
import { useOrderedRows, useRecordPager } from "@/lib/use-record-pager";
import { useRetained } from "@/lib/use-retained";

type DemoEntry = {
  id: string;
  createdAt: number;
  actor: string;
  action: string;
  ok: boolean;
  hash: string;
};

const ACTORS = ["Dana Okonkwo", "Emma Novak", "Omar Haddad", "Lina Waitfor"];
const ACTIONS = ["Updated a role", "Invited a user", "Suspended an account", "Changed the security policy"];
const START = Date.UTC(2026, 9, 1, 8, 0);

const ENTRIES: DemoEntry[] = Array.from({ length: 36 }, (_, i) => ({
  id: String(i + 1),
  createdAt: START + i * 47 * 60_000,
  actor: ACTORS[i % ACTORS.length],
  action: ACTIONS[i % ACTIONS.length],
  ok: i % 5 !== 3,
  hash: (i + 1).toString(16).padStart(2, "0").repeat(32),
}));

const entryKey = (entry: DemoEntry) => entry.id;

const PAYLOAD = { name: "Refund supervisor", is_active: true, password: "••••" };

export function RecordDrawerDemo() {
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ordered, setOrderedIds] = useOrderedRows(ENTRIES, entryKey);
  const pager = useRecordPager({
    rows: ordered,
    getId: entryKey,
    activeId: selectedId,
    onSelect: (entry) => setSelectedId(entry.id),
  });
  const live = ENTRIES.find((entry) => entry.id === selectedId) ?? null;
  const shown = useRetained(live);

  const columns: ColumnDef<DemoEntry, unknown>[] = [
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Created at",
      size: 160,
      cell: ({ row }) => <span className="tabular">{fmtDateTime(row.original.createdAt, locale)}</span>,
    },
    {
      id: "actor",
      accessorKey: "actor",
      header: "User",
      ...columnWidth("name"),
      cell: ({ row }) => <ProfileCell name={row.original.actor} />,
    },
    { id: "action", accessorKey: "action", header: "Action", ...columnWidth("text") },
    {
      id: "result",
      header: "Result",
      size: 120,
      cell: ({ row }) => (
        <StatusBadge tone={row.original.ok ? "success" : "danger"} equalWidth={false}>
          {row.original.ok ? "Success" : "Failed"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <div className="flex h-[28rem] flex-col">
        <DataTable
          columns={columns}
          data={ENTRIES}
          searchPlaceholder="Search entries"
          emptyLabel="No entries"
          itemsLabel="entries"
          pageSize={10}
          fill
          getRowId={entryKey}
          activeRowId={selectedId}
          onRowClick={(entry) => setSelectedId(entry.id)}
          rowAriaLabel={(entry) => entry.action}
          onOrderedIdsChange={setOrderedIds}
          getSearchText={(entry) => `${entry.actor} ${entry.action}`}
        />
      </div>
      <Sheet inspect open={selectedId != null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {shown && (
          <SheetContent showCloseButton={false} onSwipeNext={() => pager.step(1)} onSwipePrev={() => pager.step(-1)}>
            <RecordDrawerHeader
              pager={pager}
              link="/design-system#tables"
              title={shown.action}
              subtitle={<span className="tabular">Log ID {shown.id}</span>}
              summary={[
                { label: "Created at", value: <DateTimeValue epoch={shown.createdAt} locale={locale} /> },
                {
                  label: "Result",
                  value: (
                    <StatusBadge tone={shown.ok ? "success" : "danger"} equalWidth={false}>
                      {shown.ok ? "Success" : "Failed"}
                    </StatusBadge>
                  ),
                },
              ]}
            />
            <SheetBody className="flex flex-col gap-2">
              <DetailSection title="User">
                <ProfileCell name={shown.actor} subtitle="Built-in role" />
                <DetailList
                  divided
                  items={[
                    { label: "Device", value: "Chrome on macOS" },
                    { label: "IP hash", value: <HashValue value={shown.hash} short label="IP hash" /> },
                    { label: "Email", value: <HiddenValue /> },
                  ]}
                />
              </DetailSection>
              <DetailSection title="Change">
                <FieldsJsonPanel
                  title="Request details"
                  fields={
                    <DetailList
                      divided
                      inset
                      items={[
                        { label: "Name", value: PAYLOAD.name },
                        { label: "Active", value: "Yes" },
                        { label: "Password", value: <HiddenValue /> },
                      ]}
                    />
                  }
                  json={JSON.stringify(PAYLOAD, null, 2)}
                  copyJson={() => JSON.stringify(PAYLOAD, null, 2)}
                />
              </DetailSection>
              <DetailSection title="Changes">
                <FieldsJsonPanel
                  title="Before and after"
                  fields={
                    <DiffViewer
                      changes={[
                        { column: "status", before: "ACTIVE", after: "SUSPENDED" },
                        { column: "status_reason", before: null, after: "Left the company" },
                      ]}
                      labels={{ field: "Field", before: "Before", after: "After" }}
                    />
                  }
                  json={JSON.stringify({ status: { before: "ACTIVE", after: "SUSPENDED" } }, null, 2)}
                  copyJson={() => JSON.stringify({ status: { before: "ACTIVE", after: "SUSPENDED" } }, null, 2)}
                  fieldsFooter={<DiffLegend labels={{ removed: "Removed value", added: "Added value", empty: "Empty value" }} />}
                />
              </DetailSection>
            </SheetBody>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
