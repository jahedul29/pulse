"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  CalendarCog,
  ChevronDown,
  GitCompare,
  Earth,
  Flag,
  LandPlot,
  ListChecks,
  Lock,
  MapPinned,
  MessageSquareText,
  // Route,
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
import { accessState, canAccessPath } from "@/lib/auth/access";
import { useAccessSnapshot } from "@/lib/auth/access-probes";
import { Skeleton } from "@/components/ui/skeleton";
import { BUILDER_PATH, COUNTRIES_PATH, REGIONS_PATH } from "@/lib/locations/routes";
import { useIsClient } from "@/lib/use-is-client";
import { SECTIONS } from "@/lib/nav";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

type NavGroupItem = { href: string; key: string; icon: LucideIcon; pending?: boolean };

const USER_MGMT_ITEMS: NavGroupItem[] = [
  { href: "/admin/user-management", key: "adminAccounts", icon: UserRound },
];

const RBAC_ITEMS: NavGroupItem[] = [
  { href: "/admin/roles", key: "roles", icon: ShieldCheck },
  { href: "/admin/access", key: "adminAccess", icon: UserCog },
  { href: "/admin/audit/actions", key: "actionLog", icon: Activity },
  { href: "/admin/audit/changes", key: "changeLog", icon: GitCompare },
  { href: "/admin/settings/security", key: "securityPolicy", icon: Lock },
  { href: "/calendar-settings", key: "calendarSettings", icon: CalendarCog },
  { href: "/admin/audit/logins", key: "loginAudit", icon: ScrollText },
];

const NOTIFICATION_ITEMS: NavGroupItem[] = [
  { href: "/admin/notifications/templates", key: "notifTemplates", icon: MessageSquareText },
  // TODO: restore EDR mapping nav item when the feature is integrated
  // { href: "/admin/notifications/mapping", key: "edrMapping", icon: Route },
  { href: "/admin/notifications/log", key: "notifLog", icon: ListChecks },
  { href: "/admin/notifications/routing", key: "alertRouting", icon: SlidersHorizontal },
  { href: "/admin/notifications/alerts", key: "liveAlerts", icon: Siren },
];

const LOCATION_ITEMS: NavGroupItem[] = [
  { href: BUILDER_PATH, key: "regionBuilder", icon: LandPlot },
  { href: REGIONS_PATH, key: "regions", icon: MapPinned },
  { href: COUNTRIES_PATH, key: "countries", icon: Flag },
];

const NAV_PLACEHOLDER_ROWS = 5;

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
              if (item.pending) return <Skeleton key={item.href} className="mx-2.5 my-1 h-7" />;
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
              if (item.pending) return <Skeleton key={item.href} className="ms-9 me-3 my-0.5 h-8" />;
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
  const isClient = useIsClient();
  const { session: storedSession, probes } = useAccessSnapshot();
  const session = isClient ? storedSession : null;
  const allowed = (href: string) => canAccessPath(session, href, probes);
  const visible = (items: NavGroupItem[]) =>
    items.flatMap((item) => {
      const state = accessState(session, item.href, probes);
      if (state === "denied") return [];
      return [state === "unknown" ? { ...item, pending: true } : item];
    });
  const userMgmtItems = visible(USER_MGMT_ITEMS);
  const rbacItems = visible(RBAC_ITEMS);
  const notificationItems = visible(NOTIFICATION_ITEMS);
  const locationItems = visible(LOCATION_ITEMS);

  const activeGroup = userMgmtItems.some((i) => isActive(pathname, i.href))
    ? "userMgmtGroup"
    : rbacItems.some((i) => isActive(pathname, i.href))
      ? "rbacGroup"
      : notificationItems.some((i) => isActive(pathname, i.href))
        ? "notificationsGroup"
        : locationItems.some((i) => isActive(pathname, i.href))
          ? "locationsGroup"
          : null;
  const openNavGroups = useUiStore((state) => state.openNavGroups);
  const setNavGroupOpen = useUiStore((state) => state.setNavGroupOpen);
  const [closedActive, setClosedActive] = useState<string | null>(null);
  const [seenActive, setSeenActive] = useState(activeGroup);
  if (seenActive !== activeGroup) {
    setSeenActive(activeGroup);
    setClosedActive(null);
  }

  useEffect(() => {
    if (activeGroup) setNavGroupOpen(activeGroup, true);
  }, [activeGroup, setNavGroupOpen]);

  const isOpen = (key: string) => (key === activeGroup ? closedActive !== key : openNavGroups.includes(key));
  const toggleGroup = (key: string) => {
    const open = isOpen(key);
    setNavGroupOpen(key, !open);
    if (key === activeGroup) setClosedActive(open ? key : null);
  };

  if (!session) {
    return (
      <nav aria-busy="true" className="flex flex-1 flex-col gap-1.5 px-3 py-2">
        {Array.from({ length: NAV_PLACEHOLDER_ROWS }, (_, index) => (
          <Skeleton key={index} className={cn("h-8", collapsed ? "mx-auto w-8" : "w-full")} />
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {SECTIONS.filter((section) => section.slug === "personnel" && allowed(`/${section.slug}`)).map((section) => {
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

      {userMgmtItems.length > 0 && (
        <NavGroup
          labelKey="userManagement"
          icon={Users}
          items={userMgmtItems}
          collapsed={collapsed}
          open={isOpen("userMgmtGroup")}
          onToggle={() => toggleGroup("userMgmtGroup")}
          onNavigate={onNavigate}
        />
      )}
      {rbacItems.length > 0 && (
        <NavGroup
          labelKey="rbacGroup"
          icon={Shield}
          items={rbacItems}
          collapsed={collapsed}
          open={isOpen("rbacGroup")}
          onToggle={() => toggleGroup("rbacGroup")}
          onNavigate={onNavigate}
        />
      )}
      {notificationItems.length > 0 && (
        <NavGroup
          labelKey="notificationsGroup"
          icon={Bell}
          items={notificationItems}
          collapsed={collapsed}
          open={isOpen("notificationsGroup")}
          onToggle={() => toggleGroup("notificationsGroup")}
          onNavigate={onNavigate}
        />
      )}
      {locationItems.length > 0 && (
        <NavGroup
          labelKey="locationsGroup"
          icon={Earth}
          items={locationItems}
          collapsed={collapsed}
          open={isOpen("locationsGroup")}
          onToggle={() => toggleGroup("locationsGroup")}
          onNavigate={onNavigate}
        />
      )}
    </nav>
  );
}
