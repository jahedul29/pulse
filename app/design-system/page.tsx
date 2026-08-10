"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  DollarSign,
  Eye,
  EyeOff,
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
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
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
import { GuidelinesDialog } from "@/components/availability/guidelines-dialog";
import { NoticeDialog, NoticeHl } from "@/components/availability/notice-dialog";
import { configFor } from "@/lib/availability/rules";
import { ROLE_BADGE, ROLE_LABEL } from "@/lib/specialists";
import { SECTIONS } from "@/lib/nav";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/common/pagination";
import { TrendChart } from "@/components/clients/trend-chart";
import { BarChart } from "@/components/clients/bar-chart";
import { Donut } from "@/components/clients/donut";
import { Sparkline } from "@/components/clients/sparkline";
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
const TRAVEL = [45, 60, 75, 90, 105];
const THEMES = [
  { id: "teal", name: "Clinical Teal" },
  { id: "violet", name: "Regal Violet" },
] as const;
type ThemeId = (typeof THEMES)[number]["id"];

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
  color: string;
  icon: typeof Users;
}[] = [
  { slug: "new", label: "New clients", value: "1.3K", delta: "+7%", tone: "success", color: "var(--color-chart-1)", icon: Users },
  { slug: "active", label: "Active packages", value: "862", delta: "+9%", tone: "success", color: "var(--color-chart-2)", icon: Package },
  { slug: "susp", label: "Suspended", value: "37", delta: "+71%", tone: "danger", color: "var(--color-chart-4)", icon: PauseCircle },
  { slug: "del", label: "Deleted", value: "21", delta: "+68%", tone: "danger", color: "var(--color-chart-5)", icon: Trash2 },
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

const HEAD =
  "h-10 whitespace-nowrap border-b bg-card px-3 text-left align-middle font-medium text-foreground";
const CELL = "whitespace-nowrap border-b px-3 py-2 align-middle group-hover:bg-muted";
const FREEZE_SHADOW = "shadow-[4px_0_6px_-4px_rgba(0,0,0,0.18)]";

function Swatch({ token, hex }: { token: string; hex?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-14 w-full rounded-lg ring-1 ring-foreground/10"
        style={{ background: `var(${token})` }}
      />
      <div className="font-mono text-[11px] text-muted-foreground">{token.slice(2)}</div>
      <div className="font-mono text-[10px] text-foreground/70 uppercase">{hex || "—"}</div>
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

function fmtHM(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function Tile({ kind }: { kind: "available" | "unavailable" | "online" | "offending" }) {
  return (
    <div
      className={cn(
        "flex h-6 w-14 items-center justify-center rounded-[12px]",
        kind === "unavailable" ? "bg-[#e8134e]" : "bg-zinc-200/70",
        kind === "offending" && "ring-2 ring-amber-500",
      )}
    >
      {kind === "online" && <span className="size-2 rounded-full bg-emerald-500" />}
    </div>
  );
}

function StatCard({ stat }: { stat: (typeof STATS)[number] }) {
  const Icon = stat.icon;
  const rising = stat.delta.trim().startsWith("+");
  return (
    <Card
      size="sm"
      className="group relative overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-90 transition-opacity duration-200 group-hover:opacity-100">
        <Sparkline id={stat.slug} data={TREND} color={stat.color} />
      </div>
      <CardContent className="relative flex flex-col gap-2 pb-11">
        <div className="flex items-center justify-between">
          <span
            className="grid size-8 place-items-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in oklab, ${stat.color}, transparent 86%)`,
              color: stat.color,
            }}
          >
            <Icon className="size-4" />
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
              stat.tone === "success" ? "bg-success-muted text-success" : "bg-danger-muted text-danger",
            )}
          >
            {rising ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {stat.delta}
          </span>
        </div>
        <div className="font-heading text-3xl leading-none font-bold tabular-nums">{stat.value}</div>
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {stat.label}
        </span>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  error,
  success,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  success?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <div className="min-h-4 text-xs leading-4">
        {error ? (
          <p className="flex items-center gap-1 font-medium text-danger">
            <AlertCircle className="size-3.5 shrink-0" /> {error}
          </p>
        ) : success ? (
          <p className="flex items-center gap-1 font-medium text-success">
            <Check className="size-3.5 shrink-0" /> {success}
          </p>
        ) : hint ? (
          <p className="text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function IconInput({
  leading,
  trailing,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { leading?: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="relative flex items-center">
      {leading && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 flex -translate-y-1/2 text-muted-foreground">
          {leading}
        </span>
      )}
      <Input className={cn(leading && "pl-8", trailing && "pr-8", className)} {...props} />
      {trailing && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 text-muted-foreground">
          {trailing}
        </span>
      )}
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Checkbox({
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
        role="checkbox"
        aria-checked={checked}
        className={cn(
          "grid size-4 place-items-center rounded border transition-colors",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-transparent",
        )}
      >
        {checked && <Check className="size-3" />}
      </span>
      {label}
    </button>
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
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Activity className="size-5" />
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
                <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
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
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border text-muted-foreground">
        <PanelLeftClose className="size-5" />
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

function fmtDMY(d?: Date): string {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const TRIGGER = "h-8 w-full justify-between font-normal";

function DatePicker() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" className={cn(TRIGGER, !date && "text-muted-foreground")} />}
      >
        {date ? fmtDMY(date) : "DD/MM/YYYY"}
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
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" className={cn(TRIGGER, !date && "text-muted-foreground")} />}
      >
        {date ? `${fmtDMY(date)} ${time}` : "DD/MM/YYYY --:--"}
        <CalendarDays className="size-4 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={setDate} autoFocus />
        <div className="flex items-center gap-2 border-t p-3">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
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
  const label = range?.from
    ? range.to
      ? `${fmtDMY(range.from)} – ${fmtDMY(range.to)}`
      : fmtDMY(range.from)
    : "DD/MM/YYYY – DD/MM/YYYY";
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
  const [dark, setDark] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("teal");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [freeze, setFreeze] = useState(true);
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
    el.classList.toggle("theme-violet", theme === "violet");
    el.classList.toggle("dark", dark);
    return () => {
      el.classList.remove("theme-violet");
      el.classList.remove("dark");
    };
  }, [theme, dark]);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const tokens = [...BRAND, ...NEUTRALS, ...SEMANTIC, ...CHARTS];
    const map: Record<string, string> = {};
    tokens.forEach((t) => (map[t] = cs.getPropertyValue(t).trim()));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHexes(map);
  }, [theme, dark]);

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
                {THEMES.find((t) => t.id === theme)!.name} · component & token reference
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
            <div className="flex items-center gap-0.5 rounded-full border bg-card p-0.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    theme === t.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setDark((d) => !d)}>
              {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {dark ? "Light" : "Dark"}
            </Button>
          </div>
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-10">
          <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:p-8">
            <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
              ABAPRO UI
            </span>
            <h1 className="max-w-2xl font-heading text-3xl font-bold text-balance sm:text-4xl">
              One component library, dressed in the current theme.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Every element below is built from the same design tokens. Switch the theme in the
              header to see the whole system re-skin — colors change, structure and behavior stay
              identical.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1">Display · Bricolage Grotesque</span>
              <span className="rounded-md bg-muted px-2 py-1">Body · Hanken Grotesk</span>
              <span className="rounded-md bg-muted px-2 py-1">Data · JetBrains Mono</span>
              <span className="rounded-md bg-muted px-2 py-1">Radius · 0.7rem</span>
            </div>
          </section>

          <Section id="foundations" title="Foundations" desc="Color tokens, typography, and radius.">
            <Card>
              <CardHeader>
                <CardTitle>Color tokens</CardTitle>
                <CardDescription>
                  Every color is a CSS variable — swatches below adapt to light/dark.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <Sub label="Brand">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6">
                    {BRAND.map((t) => (
                      <Swatch key={t} token={t} hex={hexes[t]} />
                    ))}
                  </div>
                </Sub>
                <Sub label="Neutrals">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6">
                    {NEUTRALS.map((t) => (
                      <Swatch key={t} token={t} hex={hexes[t]} />
                    ))}
                  </div>
                </Sub>
                <Sub label="Semantic">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6">
                    {SEMANTIC.map((t) => (
                      <Swatch key={t} token={t} hex={hexes[t]} />
                    ))}
                  </div>
                </Sub>
                <Sub label="Charts">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6">
                    {CHARTS.map((t) => (
                      <Swatch key={t} token={t} hex={hexes[t]} />
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
                  Display: Bricolage Grotesque · Body: Hanken Grotesk · Data: JetBrains Mono
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
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
                      <span className="font-mono text-[10px] text-muted-foreground">{s}</span>
                    </div>
                  ))}
                </Sub>
                <Sub label="Radius">
                  {RADII.map(([name, cls]) => (
                    <div key={name} className="flex flex-col items-center gap-1.5">
                      <div className={cn("size-12 border-2 border-primary/50 bg-primary/10", cls)} />
                      <span className="font-mono text-[10px] text-muted-foreground">{name}</span>
                    </div>
                  ))}
                </Sub>
                <Sub label="Elevation">
                  {ELEVATION.map(([name, cls]) => (
                    <div key={name} className="flex flex-col items-center gap-1.5">
                      <div className={cn("size-12 rounded-lg bg-card ring-1 ring-foreground/5", cls)} />
                      <span className="font-mono text-[10px] text-muted-foreground">{name}</span>
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
          </Section>

          <Section
            id="navigation"
            title="Navigation"
            desc="The app shell — top bar and sidebar in expanded and collapsed states."
          >
            <Card>
              <CardHeader>
                <CardTitle>Top app bar</CardTitle>
                <CardDescription>Menu, collapse toggle, breadcrumb, and universal search.</CardDescription>
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

          <Section id="buttons" title="Buttons" desc="Variants, sizes, and states.">
            <Card>
              <CardContent className="flex flex-col gap-6 pt-6">
                <Sub label="Variants">
                  <Button>Primary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </Sub>
                <Sub label="Sizes">
                  <Button size="xs">Extra small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                </Sub>
                <Sub label="With icon / icon-only">
                  <Button>
                    <Save className="size-3.5" /> Save
                  </Button>
                  <Button variant="outline">
                    <Plus className="size-3.5" /> Add client
                  </Button>
                  <Button variant="ghost" size="icon">
                    <SlidersHorizontal className="size-4" />
                  </Button>
                </Sub>
                <Sub label="States">
                  <Button disabled>Disabled</Button>
                  <Button disabled>
                    <Loader2 className="size-3.5 animate-spin" /> Saving…
                  </Button>
                  <Button variant="outline" className="ring-2 ring-ring/40">
                    Focused
                  </Button>
                </Sub>
              </CardContent>
            </Card>
          </Section>

          <Section id="badges" title="Badges & pills" desc="Status and role indicators.">
            <Card>
              <CardContent className="flex flex-col gap-6 pt-6">
                <Sub label="Status">
                  <StatusBadge tone="success">Active</StatusBadge>
                  <StatusBadge tone="warning">Suspended</StatusBadge>
                  <StatusBadge tone="danger">Deleted</StatusBadge>
                  <StatusBadge tone="neutral">Draft</StatusBadge>
                </Sub>
                <Sub label="Specialist roles">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ROLE_BADGE.therapist)}>
                    {ROLE_LABEL.therapist}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ROLE_BADGE.analyst)}>
                    {ROLE_LABEL.analyst}
                  </span>
                </Sub>
                <Sub label="Business hours state">
                  <span className="inline-flex items-center gap-1.5 text-xs text-success">
                    <span className="size-1.5 rounded-full bg-success" /> Defined
                  </span>
                  <span className="text-xs text-muted-foreground">Not defined</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    soon
                  </span>
                </Sub>
              </CardContent>
            </Card>
          </Section>

          <Section id="forms" title="Forms" desc="The full field set for an admin panel.">
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
                    leading={<Mail className="size-4" />}
                    placeholder="jane@mail.com"
                  />
                </Field>
                <Field label="Password" htmlFor="f-pw" hint="At least 8 characters.">
                  <div className="relative flex items-center">
                    <Input id="f-pw" type={showPw ? "text" : "password"} defaultValue="secret123" className="pr-9" />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Phone" htmlFor="f-phone">
                  <IconInput
                    id="f-phone"
                    type="tel"
                    leading={<Phone className="size-4" />}
                    placeholder="+1 555 012 3456"
                  />
                </Field>
                <Field label="Amount" htmlFor="f-amt" hint="Monthly package price.">
                  <IconInput
                    id="f-amt"
                    type="number"
                    leading={<DollarSign className="size-4" />}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Website" htmlFor="f-web">
                  <div className="flex items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40">
                    <span className="border-r border-input px-2.5 text-sm text-muted-foreground">https://</span>
                    <input
                      id="f-web"
                      className="h-8 w-full bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="abapro.health"
                    />
                  </div>
                </Field>
                <Field label="Role">
                  <Select defaultValue="therapist">
                    <SelectTrigger className="h-8 w-full">
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
                <CardTitle>Date &amp; time</CardTitle>
                <CardDescription>Date, date-time, and range pickers — all DD/MM/YYYY.</CardDescription>
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
                    className="border-danger ring-1 ring-danger/30 focus-visible:border-danger focus-visible:ring-danger/30"
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
                  <Checkbox checked={notify} onChange={() => setNotify((v) => !v)} label="Email notifications" />
                  <Checkbox checked={marketing} onChange={() => setMarketing((v) => !v)} label="Product updates" />
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
                    <Switch checked={notify} onChange={() => setNotify((v) => !v)} />
                    Send weekly summary
                  </div>
                </Sub>
                <Sub label="File upload">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                    <Upload className="size-4" /> Choose file…
                    <input type="file" className="hidden" />
                  </label>
                </Sub>
              </CardContent>
            </Card>
          </Section>

          <Section
            id="feedback"
            title="Feedback"
            desc="Inline alerts, empty states, and loading skeletons."
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

          <Section id="data" title="Data display" desc="Stat cards, charts, tabs, tables, avatars, progress.">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {STATS.map((s) => (
                <StatCard key={s.slug} stat={s} />
              ))}
            </div>

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
                    <span className="rounded-full bg-success-muted px-1.5 py-0.5 font-medium text-success">
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
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ROLE_BADGE.therapist)}>
                            Therapist
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-xs text-success">
                            <span className="size-1.5 rounded-full bg-success" /> Defined
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Priya Nair</TableCell>
                        <TableCell>
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ROLE_BADGE.analyst)}>
                            Analyst
                          </span>
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
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
                  label="clients"
                />
              </CardContent>
            </Card>
          </Section>

          <Section
            id="tables"
            title="Data tables"
            desc="Long table with a locked column — it stays pinned left while the rest scrolls horizontally."
          >
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Clients</CardTitle>
                  <CardDescription>Scroll right — the Client column stays put.</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch checked={freeze} onChange={() => setFreeze((v) => !v)} />
                  <span className="cursor-pointer" onClick={() => setFreeze((v) => !v)}>
                    Freeze first column
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[1500px] border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th className={cn(HEAD, freeze && cn("sticky left-0 z-20", FREEZE_SHADOW))}>
                          <span className="inline-flex items-center gap-1">
                            Client
                            {freeze && <Lock className="size-3 text-muted-foreground/70" />}
                          </span>
                        </th>
                        <th className={HEAD}>Email</th>
                        <th className={HEAD}>Role</th>
                        <th className={HEAD}>Status</th>
                        <th className={HEAD}>Packages</th>
                        <th className={HEAD}>Sessions</th>
                        <th className={HEAD}>MRR</th>
                        <th className={HEAD}>Plan</th>
                        <th className={HEAD}>Region</th>
                        <th className={HEAD}>Phone</th>
                        <th className={HEAD}>Owner</th>
                        <th className={HEAD}>Joined</th>
                        <th className={HEAD}>Last active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CLIENTS.map((c) => {
                        const initials = c.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("");
                        const tone =
                          c.status === "Active" ? "success" : c.status === "Suspended" ? "warning" : "danger";
                        return (
                          <tr key={c.name} className="group">
                            <td
                              className={cn(
                                CELL,
                                "bg-card font-medium",
                                freeze && cn("sticky left-0 z-10", FREEZE_SHADOW),
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 font-heading text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                                  {initials}
                                </span>
                                {c.name}
                              </div>
                            </td>
                            <td className={cn(CELL, "text-muted-foreground")}>{c.email}</td>
                            <td className={CELL}>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  c.role === "Therapist" ? ROLE_BADGE.therapist : ROLE_BADGE.analyst,
                                )}
                              >
                                {c.role}
                              </span>
                            </td>
                            <td className={CELL}>
                              <StatusBadge tone={tone as "success" | "warning" | "danger"}>{c.status}</StatusBadge>
                            </td>
                            <td className={cn(CELL, "tabular-nums")}>{c.packages}</td>
                            <td className={cn(CELL, "tabular-nums")}>{c.sessions}</td>
                            <td className={cn(CELL, "font-mono text-xs")}>{c.mrr}</td>
                            <td className={cn(CELL, "text-muted-foreground")}>{c.plan}</td>
                            <td className={cn(CELL, "text-muted-foreground")}>{c.region}</td>
                            <td className={cn(CELL, "font-mono text-xs text-muted-foreground")}>{c.phone}</td>
                            <td className={cn(CELL, "text-muted-foreground")}>{c.owner}</td>
                            <td className={cn(CELL, "font-mono text-xs text-muted-foreground")}>
                              {fmtDate(c.joined)}
                            </td>
                            <td className={cn(CELL, "font-mono text-xs text-muted-foreground")}>
                              {fmtDate(c.lastActive)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="overlays" title="Overlays" desc="Dialogs, menus, tooltips, and toasts.">
            <Card>
              <CardContent className="flex flex-col gap-6 pt-6">
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
            title="Availability"
            desc="App-specific calendar components."
          >
            <Card>
              <CardContent className="flex flex-col gap-6 pt-6">
                <Alert tone="info" title="Fixed palette">
                  These calendar colors are intentionally fixed (not theme tokens) so availability
                  reads the same regardless of theme.
                </Alert>
                <Sub label="Status legend">
                  <div className="rounded-xl bg-zinc-200 px-4 py-2.5 text-sm font-semibold text-foreground">
                    Available
                  </div>
                  <div className="rounded-xl bg-[#e8134e] px-4 py-2.5 text-sm font-semibold text-white">
                    Unavailable
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl bg-zinc-200 px-4 py-2.5 text-sm font-semibold text-foreground">
                    <span className="size-3 rounded-full bg-emerald-500" /> Available Online-only
                  </div>
                </Sub>
                <Sub label="Travel-time pills">
                  {TRAVEL.map((m) => (
                    <span
                      key={m}
                      className={cn(
                        "tabular w-16 rounded-full border px-3 py-1.5 text-center text-sm font-medium",
                        m === 45
                          ? "border-[#2f1a63] bg-[#2f1a63] text-white"
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
