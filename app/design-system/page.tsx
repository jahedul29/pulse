"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  DollarSign,
  Download,
  Eye,
  Fingerprint,
  Inbox,
  Info,
  Loader2,
  Lock,
  Mail,
  Menu,
  Moon,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  PauseCircle,
  Pencil,
  Phone,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { Switch } from "@/components/common/toggle-switch";
import { Logo } from "@/components/common/logo";
import { DirhamSign, DollarSign as DollarMark } from "@/components/icons/currency-signs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate } from "@/lib/format";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Chip } from "@/components/common/chip";
import { MultiSelect, type MultiSelectOption } from "@/components/common/multi-select";
import { IconInput } from "@/components/ui/icon-input";
import { ProfileCell } from "@/components/common/profile-cell";
import { exportCsv } from "@/lib/export/csv";
import { GuidelinesDialog } from "@/components/availability/guidelines-dialog";
import { NoticeDialog, NoticeHl } from "@/components/availability/notice-dialog";
import { configFor } from "@/lib/availability/rules";
import { SECTIONS } from "@/lib/nav";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/common/pagination";
import { TrendChart } from "@/components/clients/trend-chart";
import { MetricChartPanel } from "@/components/clients/metric-chart-panel";
import { BarChart } from "@/components/clients/bar-chart";
import { Donut } from "@/components/clients/donut";
import { Sparkline } from "@/components/clients/sparkline";
import { StatCard } from "@/components/common/stat-card";
import { HidableGrid } from "@/components/common/hidable-grid";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BRAND = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--secondary",
  "--ring",
];
const NEUTRALS = ["--background", "--foreground", "--card", "--muted", "--muted-foreground", "--border"];
const SEMANTIC = [
  "--success",
  "--success-muted",
  "--warning",
  "--warning-muted",
  "--danger",
  "--danger-muted",
];
const CHARTS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];
const PALETTE = [
  "--brand-color-1",
  "--brand-color-2",
  "--brand-color-3",
  "--brand-color-4",
  "--brand-color-5",
  "--grey-1",
  "--grey-2",
  "--grey-3",
  "--grey-4",
  "--black",
  "--white",
];
const PALETTE_LABEL: Record<string, string> = {
  "--brand-color-1": "Magenta",
  "--brand-color-2": "Scarlet",
  "--brand-color-3": "Gold",
  "--brand-color-4": "Green",
  "--brand-color-5": "Blue",
  "--grey-1": "Grey 1",
  "--grey-2": "Grey 2",
  "--grey-3": "Grey 3",
  "--grey-4": "Grey 4",
  "--black": "Black",
  "--white": "Body color",
};
const TOKEN_SOURCE: Record<string, string> = {
  "--primary": "Brand color 1",
  "--primary-foreground": "Body color",
  "--accent": "Input field",
  "--accent-foreground": "Brand color 1",
  "--secondary": "Grey 1",
  "--ring": "Brand color 1",
  "--background": "Body color",
  "--foreground": "Black",
  "--card": "Body color",
  "--muted": "Grey 1",
  "--muted-foreground": "Grey 4",
  "--border": "Grey 2",
  "--success": "Brand color 4",
  "--warning": "Brand color 3",
  "--danger": "Brand color 2",
  "--chart-1": "Brand color 1",
  "--chart-2": "Brand color 5",
  "--chart-3": "Brand color 4",
  "--chart-4": "Brand color 3",
  "--chart-5": "Brand color 2",
};
const TRAVEL = [45, 60, 75, 90, 105];

const NAV = [
  ["foundations", "Foundations"],
  ["navigation", "Navigation"],
  ["buttons", "Buttons"],
  ["badges", "Badges"],
  ["forms", "Forms"],
  ["feedback", "Feedback"],
  ["data", "Data display"],
  ["tables", "Data tables"],
  ["overlays", "Overlays"],
  ["availability", "Availability"],
];

const TREND = [
  { label: "W1", value: 820 },
  { label: "W2", value: 910 },
  { label: "W3", value: 880 },
  { label: "W4", value: 1010 },
  { label: "W5", value: 1180 },
  { label: "W6", value: 1130 },
  { label: "W7", value: 1290 },
];
const SPLIT = [
  { name: "Monthly", value: 46, fill: "var(--color-chart-1)" },
  { name: "Quarterly", value: 28, fill: "var(--color-chart-2)" },
  { name: "Weekly", value: 17, fill: "var(--color-chart-3)" },
  { name: "One-off", value: 9, fill: "var(--color-chart-4)" },
];
const STATS: {
  slug: string;
  label: string;
  value: string;
  delta: string;
  tone: "success" | "danger";
  hint: string;
  icon: typeof Users;
}[] = [
  { slug: "new", label: "New clients", value: "1.3K", delta: "+7%", tone: "success", hint: "First-time registrations in period", icon: Users },
  { slug: "active", label: "Active packages", value: "862", delta: "+9%", tone: "success", hint: "Live subscriptions this period", icon: Package },
  { slug: "susp", label: "Suspended", value: "37", delta: "+71%", tone: "danger", hint: "Accounts on hold", icon: PauseCircle },
  { slug: "del", label: "Deleted", value: "21", delta: "+68%", tone: "danger", hint: "Removed accounts", icon: Trash2 },
];
const BARS = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 55 },
  { label: "Wed", value: 48 },
  { label: "Thu", value: 61 },
  { label: "Fri", value: 70 },
  { label: "Sat", value: 30 },
  { label: "Sun", value: 18 },
];
const TYPE_SCALE = [
  ["Display / H1", "text-4xl font-bold", "font-heading", "Page hero"],
  ["Heading / H2", "text-2xl font-bold", "font-heading", "Section title"],
  ["Title / H3", "text-lg font-semibold", "font-heading", "Card title"],
  ["Body", "text-sm", "font-sans", "Default copy"],
  ["Small", "text-xs", "font-sans", "Hints, metadata"],
  ["Mono", "text-sm font-mono", "font-mono", "IDs, numbers"],
];
const SPACING = [1, 2, 3, 4, 6, 8, 12];
const RADII = [
  ["sm", "rounded-sm"],
  ["md", "rounded-md"],
  ["lg", "rounded-lg"],
  ["xl", "rounded-xl"],
  ["full", "rounded-full"],
];
const ELEVATION = [
  ["shadow-xs", "shadow-xs"],
  ["shadow-sm", "shadow-sm"],
  ["shadow-md", "shadow-md"],
  ["shadow-lg", "shadow-lg"],
];
const ICONS = [Activity, CalendarDays, Bell, Search, Save, Trash2, Mail, Lock];

type Client = {
  name: string;
  email: string;
  role: "Therapist" | "Analyst";
  status: "Active" | "Suspended" | "Deleted";
  packages: number;
  mrr: string;
  sessions: number;
  region: string;
  phone: string;
  plan: string;
  owner: string;
  joined: string;
  lastActive: string;
};

const CLIENTS: Client[] = [
  { name: "Alex Rivera", email: "alex.rivera@pulse.health", role: "Therapist", status: "Active", packages: 3, mrr: "$420", sessions: 128, region: "NA-West", phone: "+1 555 0142", plan: "Monthly", owner: "S. Cole", joined: "2025-11-02", lastActive: "2026-08-05" },
  { name: "Priya Nair", email: "priya.nair@pulse.health", role: "Analyst", status: "Active", packages: 2, mrr: "$310", sessions: 74, region: "EU-Central", phone: "+44 20 7946", plan: "Quarterly", owner: "R. Diaz", joined: "2025-09-18", lastActive: "2026-08-07" },
  { name: "Daniel Okoro", email: "daniel.okoro@pulse.health", role: "Therapist", status: "Suspended", packages: 1, mrr: "$120", sessions: 41, region: "NA-East", phone: "+1 555 0199", plan: "Monthly", owner: "S. Cole", joined: "2026-01-24", lastActive: "2026-07-20" },
  { name: "Maya Chen", email: "maya.chen@pulse.health", role: "Analyst", status: "Active", packages: 4, mrr: "$540", sessions: 210, region: "APAC", phone: "+65 6123 4567", plan: "Yearly", owner: "T. Weber", joined: "2025-12-06", lastActive: "2026-08-06" },
  { name: "Tom Becker", email: "tom.becker@pulse.health", role: "Therapist", status: "Deleted", packages: 0, mrr: "$0", sessions: 12, region: "EU-West", phone: "+49 30 1234", plan: "—", owner: "R. Diaz", joined: "2026-02-11", lastActive: "2026-05-02" },
  { name: "Sara Lopez", email: "sara.lopez@pulse.health", role: "Analyst", status: "Active", packages: 2, mrr: "$280", sessions: 63, region: "NA-West", phone: "+1 555 0177", plan: "Monthly", owner: "S. Cole", joined: "2025-10-30", lastActive: "2026-08-04" },
  { name: "Idris Khan", email: "idris.khan@pulse.health", role: "Therapist", status: "Active", packages: 5, mrr: "$690", sessions: 305, region: "MENA", phone: "+971 4 123 45", plan: "Yearly", owner: "T. Weber", joined: "2026-03-02", lastActive: "2026-08-07" },
  { name: "Nora Bauer", email: "nora.bauer@pulse.health", role: "Analyst", status: "Suspended", packages: 1, mrr: "$150", sessions: 29, region: "EU-Central", phone: "+43 1 234 56", plan: "Quarterly", owner: "R. Diaz", joined: "2026-01-09", lastActive: "2026-06-28" },
];

const DEMO_CLIENTS: Client[] = Array.from({ length: 120 }, (_, i) => {
  const base = CLIENTS[i % CLIENTS.length];
  if (i < CLIENTS.length) return base;
  const n = Math.floor(i / CLIENTS.length) + 1;
  const [first, ...rest] = base.name.split(" ");
  return {
    ...base,
    name: `${first} ${rest.join(" ")} ${n}`,
    email: base.email.replace("@", `.${n}@`),
    sessions: base.sessions + i * 3,
  };
});

function DemoActions({ name }: { name: string }) {
  const actions = [
    { label: "View", icon: Eye },
    { label: "Edit", icon: Pencil },
    { label: "Suspend", icon: Lock },
    { label: "Biometrics", icon: Fingerprint },
    { label: "Delete", icon: Trash2, danger: true },
  ];
  return (
    <div className="flex items-center justify-end gap-0.5">
      <TooltipProvider>
        {actions.map(({ label, icon: Icon, danger }) => (
          <Tooltip key={label}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={label}
                  onClick={() => toast.success(`${label}: ${name}`)}
                  className={cn(
                    "size-8 text-muted-foreground hover:text-foreground",
                    danger && "hover:bg-danger-muted hover:text-danger",
                  )}
                />
              }
            >
              <Icon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}

function DataTableDemo() {
  const locale = useLocale();
  const columns = useMemo<ColumnDef<Client, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Client",
        size: 180,
        filterFn: "includesString",
        meta: { filter: "text", filterLabel: "Client" },
        cell: ({ row }) => <ProfileCell name={row.original.name} />,
      },
      {
        accessorKey: "email",
        header: "Email",
        size: 200,
        filterFn: "includesString",
        meta: { filter: "text", filterLabel: "Email" },
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      {
        accessorKey: "role",
        header: "Role",
        size: 120,
        meta: {
          filter: "select",
          filterLabel: "Role",
          filterOptions: [
            { value: "Therapist", label: "Therapist" },
            { value: "Analyst", label: "Analyst" },
          ],
        },
        cell: ({ row }) => <StatusBadge tone="neutral">{row.original.role}</StatusBadge>,
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        meta: {
          filter: "select",
          filterLabel: "Status",
          filterOptions: ["Active", "Suspended", "Deleted"].map((s) => ({ value: s, label: s })),
        },
        cell: ({ row }) => {
          const s = row.original.status;
          const tone = s === "Active" ? "success" : s === "Suspended" ? "warning" : "danger";
          return (
            <StatusBadge tone={tone as "success" | "warning" | "danger"} equalWidth={false} className="min-w-[6rem]">
              {s}
            </StatusBadge>
          );
        },
      },
      {
        accessorKey: "sessions",
        header: "Sessions",
        size: 110,
        filterFn: "inNumberRange",
        cell: ({ row }) => <span className="tabular">{row.original.sessions}</span>,
        meta: { headClassName: "text-start", cellClassName: "text-start", filter: "range", filterLabel: "Sessions" },
      },
      {
        id: "mrr",
        accessorFn: (c) => Number(c.mrr.replace(/[^0-9.]/g, "")),
        header: "MRR",
        size: 100,
        filterFn: "inNumberRange",
        cell: ({ row }) => <span className="text-xs tabular">{row.original.mrr}</span>,
        meta: { headClassName: "text-start", cellClassName: "text-start", filter: "range", filterLabel: "MRR" },
      },
      {
        accessorKey: "region",
        header: "Region",
        size: 120,
        meta: { filter: "select", filterLabel: "Region" },
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.region}</span>,
      },
      {
        id: "joined",
        accessorFn: (r) => new Date(`${r.joined}T00:00:00`).getTime(),
        header: "Joined",
        size: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular">
            {fmtDate(row.original.joined, locale)}
          </span>
        ),
        meta: {
          headClassName: "text-start",
          cellClassName: "text-start",
          filter: "dateRange",
          filterLabel: "Joined",
        },
      },
      {
        id: "actions",
        header: "Actions",
        size: 190,
        enableSorting: false,
        cell: ({ row }) => <DemoActions name={row.original.name} />,
        meta: { headClassName: "text-end", cellClassName: "text-end" },
      },
    ],
    [locale],
  );

  const onExport = () => {
    const headers = ["Client", "Email", "Role", "Status", "Sessions", "MRR", "Region", "Joined"];
    const rows = DEMO_CLIENTS.map((c) => [
      c.name,
      c.email,
      c.role,
      c.status,
      String(c.sessions),
      c.mrr,
      c.region,
      c.joined,
    ]);
    exportCsv("clients-demo.csv", headers, rows);
  };

  return (
    <DataTable
      columns={columns}
      data={DEMO_CLIENTS}
      searchPlaceholder="Search by name, email, role or region"
      emptyLabel="No clients found"
      itemsLabel="clients"
      pageSize={5}
      getSearchText={(c) => `${c.name} ${c.email} ${c.role} ${c.region}`}
      filterLabels={{ filter: "Filter", clear: "Clear", clearFilters: "Clear filters", min: "Min", max: "Max", search: "Search", from: "From", to: "To" }}
      enableFreeze
      maxFreeze={3}
      toolbar={
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="lg"
                onClick={onExport}
                aria-label="Export"
                className={toolbarIconButtonClass}
              />
            }
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Export</span>
          </TooltipTrigger>
          <TooltipContent>Export</TooltipContent>
        </Tooltip>
      }
    />
  );
}

function Swatch({ token, hex, source }: { token: string; hex?: string; source?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-14 w-full rounded-lg ring-1 ring-foreground/10"
        style={{ background: `var(${token})` }}
      />
      <div className="font-mono text-xs text-muted-foreground">{token.slice(2)}</div>
      <div className="font-mono text-xs text-foreground/70 uppercase">{hex || "—"}</div>
      {source && <div className="text-xs text-foreground/60">{source}</div>}
    </div>
  );
}

function Section({
  id,
  title,
  desc,
  children,
}: {
  id: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-4">
      <div>
        <h2 className="font-heading text-2xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
    </section>
  );
}

function Sub({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const DEMO_ROLES: MultiSelectOption[] = [
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "cco", label: "Call center operator" },
  { value: "content", label: "Content editor" },
];

function PaginationDemo({ initial, total }: { initial: number; total: number }) {
  const [page, setPage] = useState(initial);
  const [pageSize, setPageSize] = useState(25);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (p - 1) * pageSize + 1;
  const end = Math.min(p * pageSize, total);
  return (
    <Pagination
      page={p}
      pageCount={pageCount}
      total={total}
      start={start}
      end={end}
      pageSize={pageSize}
      onPage={setPage}
      onPageSize={(n) => {
        setPageSize(n);
        setPage(1);
      }}
      pageSizeOptions={[10, 25, 50, 100]}
      label="rows"
    />
  );
}

function MultiSelectDemo() {
  const [value, setValue] = useState<string[]>(["admin", "supervisor", "cco"]);
  return (
    <div className="w-full max-w-sm">
      <MultiSelect
        options={DEMO_ROLES}
        value={value}
        onChange={setValue}
        placeholder="Select roles"
        searchPlaceholder="Search roles"
        emptyLabel="No matching roles."
      />
    </div>
  );
}

function fmtHM(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function Tile({ kind }: { kind: "available" | "unavailable" | "online" | "offending" }) {
  return (
    <div
      className={cn(
        "flex h-6 w-14 items-center justify-center rounded-[12px]",
        kind === "unavailable" ? "bg-danger" : "bg-muted",
        kind === "offending" && "ring-2 ring-amber-500",
      )}
    >
      {kind === "online" && <span className="size-2 rounded-full bg-chart-3" />}
    </div>
  );
}


function Radio({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button type="button" onClick={onChange} className="flex cursor-pointer items-center gap-2 text-sm">
      <span
        role="radio"
        aria-checked={checked}
        className={cn(
          "grid size-4 place-items-center rounded-full border transition-colors",
          checked ? "border-primary" : "border-input",
        )}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
      {label}
    </button>
  );
}

function SidebarDemo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[420px] shrink-0 flex-col overflow-hidden rounded-xl border bg-sidebar text-sidebar-foreground",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-2.5 py-5", collapsed ? "justify-center px-0" : "px-5")}>
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary">
          <Logo className="h-7 w-auto" />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <div className="font-heading text-base font-semibold">ABAPRO</div>
            <div className="text-xs text-muted-foreground">Admin &amp; BI</div>
          </div>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {SECTIONS.slice(0, 6).map((s) => {
          const active = s.slug === "personnel";
          const Icon = s.icon;
          return (
            <div
              key={s.slug}
              title={collapsed ? s.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg py-2 text-sm",
                collapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{s.label}</span>}
              {!collapsed && !s.live && (
                <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  soon
                </span>
              )}
            </div>
          );
        })}
      </nav>
      <div className={cn("border-t py-3", collapsed ? "px-2" : "px-3")}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg py-2 text-sm text-muted-foreground",
            collapsed ? "justify-center px-0" : "px-3",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TopbarDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border text-muted-foreground">
        <Menu className="size-5" />
      </span>
      <div className="mr-auto min-w-0">
        <div className="truncate font-heading text-lg leading-tight font-semibold">Alex Rivera</div>
        <nav className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <span>ABAPRO</span>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />
          <span>Specialists</span>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="font-medium text-foreground">Alex Rivera</span>
        </nav>
      </div>
      <label className="relative hidden items-center md:flex">
        <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Universal search"
          className="h-9 w-56 rounded-lg border bg-card pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
        />
      </label>
    </div>
  );
}

function fmtDMY(d: Date | undefined, locale: string): string {
  if (!d) return "";
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  return fmtDate(iso, locale);
}

const TRIGGER = "h-9 w-full justify-between font-normal";

function DatePicker() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const locale = useLocale();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" className={cn(TRIGGER, !date && "text-muted-foreground")} />}
      >
        {date ? fmtDMY(date, locale) : "DD-Mmm-YYYY"}
        <CalendarDays className="size-4 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function DateTimePicker() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("09:00");
  const locale = useLocale();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" className={cn(TRIGGER, !date && "text-muted-foreground")} />}
      >
        {date ? `${fmtDMY(date, locale)} ${time}` : "DD-Mmm-YYYY --:--"}
        <CalendarDays className="size-4 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={setDate} autoFocus />
        <div className="flex items-center gap-2 border-t p-3">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
          />
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DateRangePicker() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const locale = useLocale();
  const label = range?.from
    ? range.to
      ? `${fmtDMY(range.from, locale)} – ${fmtDMY(range.to, locale)}`
      : fmtDMY(range.from, locale)
    : "DD-Mmm-YYYY – DD-Mmm-YYYY";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className={cn(TRIGGER, !range?.from && "text-muted-foreground")} />
        }
      >
        {label}
        <CalendarDays className="size-4 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={range as never}
          onSelect={(r) => setRange(r as { from?: Date; to?: Date } | undefined)}
          numberOfMonths={2}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default function DesignSystemPage() {
  const t = useTranslations("designSystem");
  const [dark, setDark] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [plan, setPlan] = useState("monthly");
  const [active, setActive] = useState("foundations");
  const [page, setPage] = useState(2);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hexes, setHexes] = useState<Record<string, string>>({});

  const perPage = 10;
  const total = 96;
  const pageCount = Math.ceil(total / perPage);
  const pageStart = (page - 1) * perPage + 1;
  const pageEnd = Math.min(page * perPage, total);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", dark);
    return () => {
      el.classList.remove("dark");
    };
  }, [dark]);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const tokens = [...PALETTE, ...BRAND, ...NEUTRALS, ...SEMANTIC, ...CHARTS];
    const map: Record<string, string> = {};
    tokens.forEach((t) => (map[t] = cs.getPropertyValue(t).trim()));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHexes(map);
  }, [dark]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px" },
    );
    NAV.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div>
      <div className="min-h-svh bg-background font-sans text-foreground">
        <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-4">
            <div className="mr-auto">
              <div className="font-heading text-lg font-bold">ABAPRO — Design System</div>
              <div className="text-xs text-muted-foreground">
                Regal Violet · component &amp; token reference
              </div>
            </div>
            <nav className="hidden items-center gap-1 xl:flex">
              {NAV.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    active === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {label}
                </a>
              ))}
            </nav>
            <Button variant="outline" size="sm" onClick={() => setDark((d) => !d)}>
              {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {dark ? t("light") : t("dark")}
            </Button>
          </div>
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-10">
          <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:p-8">
            <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
              ABAPRO UI
            </span>
            <h1 className="max-w-2xl font-heading text-3xl font-bold text-balance sm:text-4xl">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{t("intro")}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1">Display · Manrope</span>
              <span className="rounded-md bg-muted px-2 py-1">Body · Manrope</span>
              <span className="rounded-md bg-muted px-2 py-1">Data · JetBrains Mono</span>
              <span className="rounded-md bg-muted px-2 py-1">Radius · 0.7rem</span>
            </div>
          </section>

          <Section id="foundations" title={t("foundationsTitle")} desc={t("foundationsDesc")}>
            <Card>
              <CardHeader>
                <CardTitle>Color tokens</CardTitle>
                <CardDescription>
                  Every color is a CSS variable — swatches below adapt to light/dark.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <Sub label="Palette">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6">
                    {PALETTE.map((t) => (
                      <Swatch key={t} token={t} hex={hexes[t]} source={PALETTE_LABEL[t]} />
                    ))}
                  </div>
                </Sub>
                <Sub label="Brand">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6">
                    {BRAND.map((t) => (
                      <Swatch key={t} token={t} hex={hexes[t]} source={TOKEN_SOURCE[t]} />
                    ))}
                  </div>
                </Sub>
                <Sub label="Neutrals">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6">
                    {NEUTRALS.map((t) => (
                      <Swatch key={t} token={t} hex={hexes[t]} source={TOKEN_SOURCE[t]} />
                    ))}
                  </div>
                </Sub>
                <Sub label="Semantic">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6">
                    {SEMANTIC.map((t) => (
                      <Swatch key={t} token={t} hex={hexes[t]} source={TOKEN_SOURCE[t]} />
                    ))}
                  </div>
                </Sub>
                <Sub label="Charts">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6">
                    {CHARTS.map((t) => (
                      <Swatch key={t} token={t} hex={hexes[t]} source={TOKEN_SOURCE[t]} />
                    ))}
                  </div>
                </Sub>
                <Sub label="On-color pairs">
                  {[
                    ["Primary", "bg-primary text-primary-foreground"],
                    ["Accent", "bg-accent text-accent-foreground"],
                    ["Success", "bg-success text-success-foreground"],
                    ["Warning", "bg-warning text-warning-foreground"],
                    ["Danger", "bg-danger text-danger-foreground"],
                  ].map(([name, cls]) => (
                    <div
                      key={name}
                      className={cn(
                        "flex h-14 w-24 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium",
                        cls,
                      )}
                    >
                      <span className="text-base font-bold">Aa</span>
                      {name}
                    </div>
                  ))}
                </Sub>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Typography</CardTitle>
                <CardDescription>
                  Display: Manrope · Body: Manrope · Data: JetBrains Mono
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b text-start text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        <th className="py-2 pr-4">Sample</th>
                        <th className="py-2 pr-4">Role</th>
                        <th className="py-2 pr-4">Token</th>
                        <th className="py-2">Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TYPE_SCALE.map(([role, cls, family, usage]) => (
                        <tr key={role} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <span className={cn(cls, family)}>Ag</span>
                          </td>
                          <td className="py-3 pr-4 font-medium whitespace-nowrap">{role}</td>
                          <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{cls}</td>
                          <td className="py-3 text-muted-foreground">{usage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spacing, radius &amp; elevation</CardTitle>
                <CardDescription>The structural scales that keep layouts consistent.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <Sub label="Spacing (× 0.25rem)">
                  {SPACING.map((s) => (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <div className="bg-primary/70" style={{ width: `${s * 4}px`, height: 16 }} />
                      <span className="font-mono text-xs text-muted-foreground">{s}</span>
                    </div>
                  ))}
                </Sub>
                <Sub label="Radius">
                  {RADII.map(([name, cls]) => (
                    <div key={name} className="flex flex-col items-center gap-1.5">
                      <div className={cn("size-12 border-2 border-primary/50 bg-primary/10", cls)} />
                      <span className="font-mono text-xs text-muted-foreground">{name}</span>
                    </div>
                  ))}
                </Sub>
                <Sub label="Elevation">
                  {ELEVATION.map(([name, cls]) => (
                    <div key={name} className="flex flex-col items-center gap-1.5">
                      <div className={cn("size-12 rounded-lg bg-card ring-1 ring-foreground/5", cls)} />
                      <span className="font-mono text-xs text-muted-foreground">{name}</span>
                    </div>
                  ))}
                </Sub>
                <Sub label="Iconography · lucide · size-4 default">
                  {ICONS.map((Icon, i) => (
                    <div
                      key={i}
                      className="grid size-9 place-items-center rounded-lg border text-muted-foreground"
                    >
                      <Icon className="size-4" />
                    </div>
                  ))}
                </Sub>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Currency signs</CardTitle>
                <CardDescription>
                  US dollar and UAE dirham marks — SVG, inherit color, scale with font size.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-x-10 gap-y-6">
                <div className="flex flex-col items-center gap-2">
                  <DollarMark className="h-12 w-auto text-foreground" />
                  <span className="text-xs text-muted-foreground">Dollar · USD</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <DirhamSign className="h-12 w-auto text-foreground" />
                  <span className="text-xs text-muted-foreground">Dirham · AED</span>
                </div>
                <div className="flex flex-col gap-3">
                  <span className="inline-flex items-center gap-1.5 font-heading text-3xl font-semibold tabular">
                    <DollarMark className="h-[0.85em] w-auto" />
                    1,284.50
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-heading text-3xl font-semibold tabular">
                    <DirhamSign className="h-[0.85em] w-auto" />
                    1,284.50
                  </span>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="navigation"
            title={t("navigationTitle")}
            desc={t("navigationDesc")}
          >
            <Card>
              <CardHeader>
                <CardTitle>Top app bar</CardTitle>
                <CardDescription>Menu, breadcrumb, and universal search.</CardDescription>
              </CardHeader>
              <CardContent>
                <TopbarDemo />
              </CardContent>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sidebar — expanded</CardTitle>
                  <CardDescription>Icons with labels; active item highlighted.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SidebarDemo collapsed={false} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Sidebar — collapsed</CardTitle>
                  <CardDescription>Icons only; labels appear on hover as tooltips.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SidebarDemo collapsed />
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section id="buttons" title={t("buttonsTitle")} desc={t("buttonsDesc")}>
            <Card>
              <CardContent className="flex flex-col gap-6">
                <Sub label="Variants">
                  <Button size="lg" className="min-w-[6.5rem]">Primary</Button>
                  <Button size="lg" variant="outline" className="min-w-[6.5rem]">Outline</Button>
                  <Button size="lg" variant="secondary" className="min-w-[6.5rem]">Secondary</Button>
                  <Button size="lg" variant="ghost" className="min-w-[6.5rem]">Ghost</Button>
                  <Button size="lg" variant="destructive" className="min-w-[6.5rem]">Destructive</Button>
                  <Button size="lg" variant="link" className="min-w-[6.5rem]">Link</Button>
                </Sub>
                <Sub label="Icon">
                  <Button size="lg" className="min-w-[7.9rem]">
                    <Plus className="size-4" /> Primary
                  </Button>
                  <Button size="lg" variant="outline" className="min-w-[7.9rem]">
                    <Download className="size-4" /> Outline
                  </Button>
                  <Button size="lg" variant="secondary" className="min-w-[7.9rem]">
                    <Save className="size-4" /> Secondary
                  </Button>
                  <Button size="lg" variant="ghost" className="min-w-[7.9rem]">
                    <SlidersHorizontal className="size-4" /> Ghost
                  </Button>
                  <Button size="lg" variant="destructive" className="min-w-[7.9rem]">
                    <Trash2 className="size-4" /> Destructive
                  </Button>
                </Sub>
                <Sub label="Icon button">
                  <Button size="icon-lg" aria-label="Primary">
                    <Plus className="size-4" />
                  </Button>
                  <Button size="icon-lg" variant="outline" aria-label="Outline">
                    <Download className="size-4" />
                  </Button>
                  <Button size="icon-lg" variant="secondary" aria-label="Secondary">
                    <Save className="size-4" />
                  </Button>
                  <Button size="icon-lg" variant="ghost" aria-label="Ghost">
                    <SlidersHorizontal className="size-4" />
                  </Button>
                  <Button size="icon-lg" variant="destructive" aria-label="Destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </Sub>
                <Sub label="Sizes">
                  <Button size="xs" className="min-w-[6rem]">Extra small</Button>
                  <Button size="sm" className="min-w-[6rem]">Small</Button>
                  <Button size="md" className="min-w-[6rem]">Medium</Button>
                  <Button size="lg" className="min-w-[6rem]">Large</Button>
                  <Button size="xl" className="min-w-[6rem]">Extra large</Button>
                  <Button size="2xl" className="min-w-[6rem]">2XL</Button>
                </Sub>
                <Sub label="States">
                  <Button size="lg" disabled className="min-w-[6.4rem]">Disabled</Button>
                  <Button size="lg" disabled className="min-w-[6.4rem]">
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </Button>
                </Sub>
              </CardContent>
            </Card>
          </Section>

          <Section id="badges" title={t("badgesTitle")} desc={t("badgesDesc")}>
            <Card>
              <CardContent className="flex flex-col gap-6">
                <Sub label="Status">
                  <StatusBadge tone="success">Active</StatusBadge>
                  <StatusBadge tone="warning">Suspended</StatusBadge>
                  <StatusBadge tone="danger">Deleted</StatusBadge>
                  <StatusBadge tone="neutral">Draft</StatusBadge>
                </Sub>
                <Sub label="Chips — outline (default)">
                  <Chip>Admin</Chip>
                  <Chip>Supervisor</Chip>
                  <Chip>Call center operator</Chip>
                </Sub>
                <Sub label="Chips — soft">
                  <Chip variant="soft">Content editor</Chip>
                  <Chip variant="soft">+2 more</Chip>
                </Sub>
                <Sub label="Business hours state">
                  <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                    <span className="size-1.5 rounded-full bg-success" /> Defined
                  </span>
                  <span className="text-xs text-muted-foreground">Not defined</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    soon
                  </span>
                </Sub>
              </CardContent>
            </Card>
          </Section>

          <Section id="forms" title={t("formsTitle")} desc={t("formsDesc")}>
            <Card>
              <CardHeader>
                <CardTitle>Field types</CardTitle>
                <CardDescription>Text, numeric, choice, date, and long-form inputs.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" htmlFor="f-name">
                  <Input id="f-name" placeholder="Jane Doe" />
                </Field>
                <Field label="Email" htmlFor="f-email">
                  <IconInput
                    id="f-email"
                    type="email"
                    dir="ltr"
                    leading={<Mail className="size-4" />}
                    placeholder="jane@mail.com"
                  />
                </Field>
                <Field label="Password" htmlFor="f-pw" hint="At least 8 characters.">
                  <PasswordInput id="f-pw" defaultValue="secret123" />
                </Field>
                <Field label="Phone" htmlFor="f-phone">
                  <IconInput
                    id="f-phone"
                    type="tel"
                    dir="ltr"
                    leading={<Phone className="size-4" />}
                    placeholder="+1 555 012 3456"
                  />
                </Field>
                <Field label="Amount" htmlFor="f-amt" hint="Monthly package price.">
                  <IconInput
                    id="f-amt"
                    type="number"
                    dir="ltr"
                    leading={<DollarSign className="size-4" />}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Website" htmlFor="f-web">
                  <div dir="ltr" className="flex items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40">
                    <span className="border-e border-input px-2.5 text-sm text-muted-foreground">https://</span>
                    <input
                      id="f-web"
                      className="h-9 w-full bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="abapro.health"
                    />
                  </div>
                </Field>
                <Field label="Role">
                  <Select defaultValue="therapist">
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v) => (v === "therapist" ? "Therapist" : "Analyst")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="therapist">Therapist</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Due date">
                  <DatePicker />
                </Field>
                <Field label="Notes" htmlFor="f-notes" className="sm:col-span-2">
                  <textarea
                    id="f-notes"
                    rows={3}
                    placeholder="Internal notes…"
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Control sizes</CardTitle>
                <CardDescription>
                  Shared scale (Input + Select): sm 32 · md 36 (default) · lg 40 px on desktop; each +4px on
                  mobile.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-3">
                <Field label="Input · sm">
                  <Input size="sm" placeholder="sm" />
                </Field>
                <Field label="Input · md">
                  <Input size="md" placeholder="md (default)" />
                </Field>
                <Field label="Input · lg">
                  <Input size="lg" placeholder="lg" />
                </Field>
                <Field label="Select · sm">
                  <Select defaultValue="a">
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue>{(v) => (v === "a" ? "Small" : "Other")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Small</SelectItem>
                      <SelectItem value="b">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Select · md">
                  <Select defaultValue="a">
                    <SelectTrigger size="md" className="w-full">
                      <SelectValue>{(v) => (v === "a" ? "Medium" : "Other")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Medium</SelectItem>
                      <SelectItem value="b">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Select · lg">
                  <Select defaultValue="a">
                    <SelectTrigger size="lg" className="w-full">
                      <SelectValue>{(v) => (v === "a" ? "Large" : "Other")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Large</SelectItem>
                      <SelectItem value="b">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Date &amp; time</CardTitle>
                <CardDescription>Date, date-time, and range pickers — all DD-Mmm-YYYY.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-3">
                <Field label="Date">
                  <DatePicker />
                </Field>
                <Field label="Date & time">
                  <DateTimePicker />
                </Field>
                <Field label="Date range">
                  <DateRangePicker />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leading & trailing icons</CardTitle>
                <CardDescription>Icons sit vertically centered inside the field.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-3">
                <Field label="Leading">
                  <IconInput leading={<Search className="size-4" />} placeholder="Search clients" />
                </Field>
                <Field label="Trailing">
                  <IconInput trailing={<ChevronDown className="size-4" />} placeholder="Filter by status" />
                </Field>
                <Field label="Both">
                  <IconInput
                    leading={<Mail className="size-4" />}
                    trailing={<X className="size-4" />}
                    placeholder="you@mail.com"
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Validation & states</CardTitle>
                <CardDescription>Error, success, and disabled fields.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-3">
                <Field label="Email" htmlFor="f-err" error="Enter a valid email address.">
                  <IconInput
                    id="f-err"
                    leading={<Mail className="size-4" />}
                    defaultValue="not-an-email"
                    aria-invalid
                  />
                </Field>
                <Field label="Username" htmlFor="f-ok" success="Available.">
                  <Input
                    id="f-ok"
                    defaultValue="alex.rivera"
                    className="border-success ring-1 ring-success/30 focus-visible:border-success focus-visible:ring-success/30"
                  />
                </Field>
                <Field label="Account ID" htmlFor="f-dis" hint="Read-only.">
                  <Input id="f-dis" disabled defaultValue="cl_8f3a12" />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Selection controls</CardTitle>
                <CardDescription>Checkbox, radio, switch, and file upload.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <Sub label="Checkboxes">
                  <Checkbox checked={notify} onCheckedChange={setNotify} label="Email notifications" />
                  <Checkbox checked={marketing} onCheckedChange={setMarketing} label="Product updates" />
                </Sub>
                <Sub label="Radio group — billing cycle">
                  {["monthly", "quarterly", "yearly"].map((p) => (
                    <Radio
                      key={p}
                      checked={plan === p}
                      onChange={() => setPlan(p)}
                      label={p[0].toUpperCase() + p.slice(1)}
                    />
                  ))}
                </Sub>
                <Sub label="Switch">
                  <div className="flex items-center gap-2 text-sm">
                    <Switch checked={notify} onCheckedChange={setNotify} />
                    Send weekly summary
                  </div>
                </Sub>
                <Sub label="File upload">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                    <Upload className="size-4" /> Choose file…
                    <input type="file" className="hidden" />
                  </label>
                </Sub>
                <Sub label="Multi-select">
                  <MultiSelectDemo />
                </Sub>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="feedback"
            title={t("feedbackTitle")}
            desc={t("feedbackDesc")}
          >
            <Card>
              <CardHeader>
                <CardTitle>Inline alerts</CardTitle>
                <CardDescription>Persistent, in-context messages (toasts are transient).</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Alert tone="info" title="Heads up">
                  Business hours aren&apos;t defined for 2 specialists.
                </Alert>
                <Alert tone="success" title="Saved">
                  Availability was updated for Alex Rivera.
                </Alert>
                <Alert tone="warning" title="Approaching limit">
                  You&apos;ve marked the maximum of 2 days off.
                </Alert>
                <Alert tone="danger" title="Couldn't save">
                  An online block must be at least 30 minutes. Fix the highlighted slots.
                </Alert>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Empty state</CardTitle>
                  <CardDescription>An invitation to act, not a dead end.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
                    <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                      <Inbox className="size-6" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="font-heading font-semibold">No specialists yet</div>
                      <p className="max-w-xs text-sm text-muted-foreground">
                        Add your first specialist to start setting weekly business hours.
                      </p>
                    </div>
                    <Button size="sm">
                      <Plus className="size-3.5" /> Add specialist
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Loading skeleton</CardTitle>
                  <CardDescription>Placeholder shape while data loads.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section id="data" title={t("dataTitle")} desc={t("dataDesc")}>
            <HidableGrid
              items={STATS}
              getKey={(s) => s.slug}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              restoreLabel={(n) => `Show hidden (${n})`}
              renderItem={(s, api) => (
                <StatCard
                  slug={s.slug}
                  icon={s.icon}
                  value={s.value}
                  delta={s.delta}
                  up={!s.delta.trim().startsWith("-")}
                  good={s.tone === "success"}
                  label={s.label}
                  subtitle={s.hint}
                  trend={TREND}
                  onHide={api.hide}
                  hideLabel={`Hide ${s.label}`}
                />
              )}
            />

            <MetricChartPanel />

            <Card>
              <CardHeader>
                <CardTitle>Charts</CardTitle>
                <CardDescription>Area, bar, donut, and sparkline — all driven by chart tokens.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    New clients · area
                  </div>
                  <TrendChart data={TREND} />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Sessions by day · bar
                  </div>
                  <BarChart data={BARS} />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Package split · donut
                  </div>
                  <Donut data={SPLIT} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Sessions · sparkline
                  </div>
                  <Sparkline id="ds" data={TREND} />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>New clients</CardTitle>
                  <CardDescription>This month</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="font-heading text-3xl font-bold">1.3K</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-success px-1.5 py-0.5 font-medium text-success-foreground">
                      +7%
                    </span>
                    <span className="text-muted-foreground">vs last period</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-9 ring-1 ring-primary/20">
                      <AvatarFallback className="bg-primary/12 font-heading text-xs font-semibold text-primary">
                        AR
                      </AvatarFallback>
                    </Avatar>
                    <Avatar className="size-9 ring-1 ring-primary/20">
                      <AvatarFallback className="bg-primary/12 font-heading text-xs font-semibold text-primary">
                        PN
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-muted-foreground">Profiles complete</div>
                    <Progress value={72} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tabs</CardTitle>
                  <CardDescription>Segmented navigation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="gap-4">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="profiles">Profiles</TabsTrigger>
                      <TabsTrigger value="billing">Billing</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="text-sm text-muted-foreground">
                      Account summary and recent activity.
                    </TabsContent>
                    <TabsContent value="profiles" className="text-sm text-muted-foreground">
                      Linked profiles on this account.
                    </TabsContent>
                    <TabsContent value="billing" className="text-sm text-muted-foreground">
                      Packages and invoices.
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Table</CardTitle>
                <CardDescription>Bordered container + row separators, with pagination.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Specialist</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Business hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Alex Rivera</TableCell>
                        <TableCell>
                          <StatusBadge tone="neutral">Therapist</StatusBadge>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                            <span className="size-1.5 rounded-full bg-success" /> Defined
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Priya Nair</TableCell>
                        <TableCell>
                          <StatusBadge tone="neutral">Analyst</StatusBadge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">Not defined</span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  total={total}
                  start={pageStart}
                  end={pageEnd}
                  onPage={(p) => setPage(Math.min(pageCount, Math.max(1, p)))}
                  label="clients"
                />
              </CardContent>
            </Card>
          </Section>

          <Section
            id="tables"
            title={t("dataTablesTitle")}
            desc={t("dataTablesDesc")}
          >
            <Card>
              <CardHeader>
                <CardTitle>Clients</CardTitle>
                <CardDescription>
                  Universal search, per-column sort &amp; filter, freeze columns, and row actions — all
                  from the shared DataTable.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTableDemo />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagination</CardTitle>
                <CardDescription>
                  Shared across every table. Rows-per-page, windowed page numbers with ellipses, a
                  Go-to input past 7 pages, and prev/next. Shown here at 20 pages.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <Sub label="Many pages (mid-range)">
                  <div className="w-full rounded-lg border p-3">
                    <PaginationDemo initial={9} total={500} />
                  </div>
                </Sub>
                <Sub label="First page">
                  <div className="w-full rounded-lg border p-3">
                    <PaginationDemo initial={1} total={500} />
                  </div>
                </Sub>
                <Sub label="Few pages (no ellipsis / no Go-to)">
                  <div className="w-full rounded-lg border p-3">
                    <PaginationDemo initial={2} total={90} />
                  </div>
                </Sub>
              </CardContent>
            </Card>
          </Section>

          <Section id="overlays" title={t("overlaysTitle")} desc={t("overlaysDesc")}>
            <Card>
              <CardContent className="flex flex-col gap-6">
                <Sub label="Dropdown menu">
                  <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                    <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                      Actions <ChevronDown className="size-3.5" />
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-44 p-1">
                      {[
                        { icon: Pencil, label: "Edit" },
                        { icon: Copy, label: "Duplicate" },
                      ].map(({ icon: Icon, label }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setMenuOpen(false)}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <Icon className="size-4 text-muted-foreground" /> {label}
                        </button>
                      ))}
                      <div className="my-1 h-px bg-border" />
                      <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-danger hover:bg-danger-muted"
                      >
                        <Trash2 className="size-4" /> Delete
                      </button>
                    </PopoverContent>
                  </Popover>
                </Sub>
                <Sub label="Tooltip">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger render={<Button variant="outline" size="icon" />}>
                        <MoreVertical className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>More actions</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-xs text-muted-foreground">Hover the button →</span>
                </Sub>
                <Sub label="Dialogs">
                  <Button variant="outline" onClick={() => setDialogOpen(true)}>
                    Open dialog
                  </Button>
                  <Button variant="destructive" onClick={() => setAlertOpen(true)}>
                    <Trash2 className="size-3.5" /> Delete (alert)
                  </Button>
                </Sub>
                <Sub label="Toasts">
                  <Button variant="outline" onClick={() => toast.success("Availability saved")}>
                    <Check className="size-3.5" /> Success
                  </Button>
                  <Button variant="outline" onClick={() => toast.error("Online block needs 30m")}>
                    Error
                  </Button>
                  <Button variant="outline" onClick={() => toast.info("Travel time updated")}>
                    <Info className="size-3.5" /> Info
                  </Button>
                  <Button variant="outline" onClick={() => toast.warning("Maximum 2 days off")}>
                    <Bell className="size-3.5" /> Warning
                  </Button>
                </Sub>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="availability"
            title={t("availabilityTitle")}
            desc={t("availabilityDesc")}
          >
            <Card>
              <CardContent className="flex flex-col gap-6">
                <Sub label="Status legend">
                  <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="flex items-center justify-center rounded-xl bg-muted px-4 py-2.5 text-center text-sm font-semibold text-muted-foreground ring-1 ring-inset ring-border-strong">
                      Available In-person
                    </div>
                    <div className="flex items-center justify-center rounded-xl bg-danger px-4 py-2.5 text-center text-sm font-semibold text-danger-foreground">
                      Unavailable
                    </div>
                    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-muted px-4 py-2.5 text-center text-sm font-semibold text-muted-foreground ring-1 ring-inset ring-border-strong">
                      <span className="size-3 rounded-full bg-chart-3" /> Available Online-only
                    </div>
                  </div>
                </Sub>
                <Sub label="Travel-time pills">
                  {TRAVEL.map((m) => (
                    <span
                      key={m}
                      className={cn(
                        "tabular w-16 rounded-full border px-3 py-1.5 text-center text-sm font-medium",
                        m === 45
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground",
                      )}
                    >
                      {fmtHM(m)}
                    </span>
                  ))}
                </Sub>
                <Sub label="Calendar tiles">
                  <div className="flex items-center gap-2">
                    <Tile kind="available" />
                    <span className="text-xs text-muted-foreground">available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tile kind="unavailable" />
                    <span className="text-xs text-muted-foreground">unavailable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tile kind="online" />
                    <span className="text-xs text-muted-foreground">online-only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tile kind="offending" />
                    <span className="text-xs text-muted-foreground">rule violation</span>
                  </div>
                </Sub>
                <Sub label="Modals">
                  <Button variant="outline" onClick={() => setGuidelinesOpen(true)}>
                    <Info className="size-3.5" /> Guidelines
                  </Button>
                  <Button variant="outline" onClick={() => setNoticeOpen(true)}>
                    Notice
                  </Button>
                </Sub>
              </CardContent>
            </Card>
          </Section>
        </main>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update calendar rules</DialogTitle>
              <DialogDescription>Header and footer stay pinned; the body scrolls.</DialogDescription>
            </DialogHeader>
            <DialogBody className="text-sm text-muted-foreground">
              These parameters come from the Services module. Editing them re-checks the calendar.
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Apply rules</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this client?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the account and its profiles for this session. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => toast.success("Client deleted")}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <GuidelinesDialog
          open={guidelinesOpen}
          onOpenChange={setGuidelinesOpen}
          role="analyst"
          config={configFor("analyst")}
        />

        <NoticeDialog
          open={noticeOpen}
          onOpenChange={setNoticeOpen}
          title="Business hours set to maximum availability"
        >
          Your weekly business hours are set to{" "}
          <NoticeHl>maximum availability 06:00–24:00, MO–SU</NoticeHl>. You can change them until
          the first booking for your services is confirmed.
        </NoticeDialog>
      </div>
    </div>
  );
}
