"use client";

import { useState } from "react";
import {
  Activity,
  Bell,
  ChevronDown,
  GitCompare,
  ListChecks,
  Lock,
  MessageSquareText,
  Route,
  ScrollText,
  Shield,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  UserCog,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

type NavGroupItem = { href: string; key: string; icon: LucideIcon };

const USER_MGMT_ITEMS: NavGroupItem[] = [
  { href: "/admin/user-management", key: "adminAccounts", icon: UserRound },
];

const RBAC_ITEMS: NavGroupItem[] = [
  { href: "/admin/roles", key: "roles", icon: ShieldCheck },
  { href: "/admin/access", key: "adminAccess", icon: UserCog },
  { href: "/admin/audit/actions", key: "actionLog", icon: Activity },
  { href: "/admin/audit/changes", key: "changeLog", icon: GitCompare },
  { href: "/admin/settings/security", key: "securityPolicy", icon: Lock },
  { href: "/admin/audit/logins", key: "loginAudit", icon: ScrollText },
];

const NOTIFICATION_ITEMS: NavGroupItem[] = [
  { href: "/admin/notifications/templates", key: "notifTemplates", icon: MessageSquareText },
  { href: "/admin/notifications/mapping", key: "edrMapping", icon: Route },
  { href: "/admin/notifications/log", key: "notifLog", icon: ListChecks },
  { href: "/admin/notifications/routing", key: "alertRouting", icon: SlidersHorizontal },
  { href: "/admin/notifications/alerts", key: "liveAlerts", icon: Siren },
];

const LINK_BASE =
  "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function activeCls(active: boolean): string {
  return active
    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground";
}

function NavGroup({
  labelKey,
  icon: GroupIcon,
  items,
  collapsed,
  open,
  onToggle,
  onNavigate,
}: {
  labelKey: string;
  icon: LucideIcon;
  items: NavGroupItem[];
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const groupActive = items.some((i) => isActive(pathname, i.href));
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  if (collapsed) {
    return (
      <Popover open={flyoutOpen} onOpenChange={setFlyoutOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              title={t(labelKey)}
              aria-label={t(labelKey)}
              className={cn(
                LINK_BASE,
                "w-full justify-center px-0",
                groupActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            />
          }
        >
          <GroupIcon className="size-4 shrink-0" />
        </PopoverTrigger>
        <PopoverContent side="inline-end" align="start" sideOffset={10} className="w-56 gap-1 p-1">
          <div className="px-2 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t(labelKey)}
          </div>
          <div className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setFlyoutOpen(false);
                    onNavigate?.();
                  }}
                  className={cn(LINK_BASE, "px-2.5 py-2", activeCls(active))}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{t(item.key)}</span>
                </Link>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          LINK_BASE,
          "w-full px-3",
          groupActive
            ? open
              ? "text-foreground"
              : "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        )}
      >
        <GroupIcon className="size-4 shrink-0" />
        <span className="truncate">{t(labelKey)}</span>
        <ChevronDown
          className={cn("ms-auto size-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-0.5 pt-0.5" inert={!open}>
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(LINK_BASE, "ps-9 pe-3", activeCls(active))}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{t(item.key)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NavItems({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const activeGroup = USER_MGMT_ITEMS.some((i) => isActive(pathname, i.href))
    ? "userMgmtGroup"
    : RBAC_ITEMS.some((i) => isActive(pathname, i.href))
      ? "rbacGroup"
      : NOTIFICATION_ITEMS.some((i) => isActive(pathname, i.href))
        ? "notificationsGroup"
        : null;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);
  const toggleGroup = (key: string) => setOpenGroup((previous) => (previous === key ? null : key));

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {SECTIONS.filter((section) => section.slug === "personnel").map((section) => {
        const href = `/${section.slug}`;
        const active = isActive(pathname, href);
        const label = t(`sections.${section.slug}`);
        const Icon = section.icon;
        return (
          <Link
            key={section.slug}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            className={cn(LINK_BASE, collapsed ? "justify-center px-0" : "px-3", activeCls(active))}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
            {!collapsed && !section.live && (
              <span className="ms-auto rounded-full bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {t("soon")}
              </span>
            )}
          </Link>
        );
      })}

      <NavGroup
        labelKey="userManagement"
        icon={Users}
        items={USER_MGMT_ITEMS}
        collapsed={collapsed}
        open={openGroup === "userMgmtGroup"}
        onToggle={() => toggleGroup("userMgmtGroup")}
        onNavigate={onNavigate}
      />
      <NavGroup
        labelKey="rbacGroup"
        icon={Shield}
        items={RBAC_ITEMS}
        collapsed={collapsed}
        open={openGroup === "rbacGroup"}
        onToggle={() => toggleGroup("rbacGroup")}
        onNavigate={onNavigate}
      />
      <NavGroup
        labelKey="notificationsGroup"
        icon={Bell}
        items={NOTIFICATION_ITEMS}
        collapsed={collapsed}
        open={openGroup === "notificationsGroup"}
        onToggle={() => toggleGroup("notificationsGroup")}
        onNavigate={onNavigate}
      />
    </nav>
  );
}
