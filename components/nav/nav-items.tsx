"use client";

import { useState } from "react";
import {
  Activity,
  ChevronDown,
  GitCompare,
  Lock,
  ScrollText,
  Shield,
  ShieldCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

type RbacItem = { href: string; key: string; icon: LucideIcon };

const RBAC_ITEMS: RbacItem[] = [
  { href: "/admin/roles", key: "roles", icon: ShieldCheck },
  { href: "/admin/access", key: "adminAccess", icon: UserCog },
  { href: "/admin/audit/actions", key: "actionLog", icon: Activity },
  { href: "/admin/audit/changes", key: "changeLog", icon: GitCompare },
  { href: "/admin/settings/security", key: "securityPolicy", icon: Lock },
  { href: "/admin/audit/logins", key: "loginAudit", icon: ScrollText },
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

export function NavItems({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const groupActive = RBAC_ITEMS.some((i) => isActive(pathname, i.href));
  const [open, setOpen] = useState(groupActive);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {SECTIONS.filter((s) => s.slug === "personnel").map((s) => {
        const href = `/${s.slug}`;
        const active = isActive(pathname, href);
        const label = t(`sections.${s.slug}`);
        const Icon = s.icon;
        return (
          <Link
            key={s.slug}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            className={cn(LINK_BASE, collapsed ? "justify-center px-0" : "px-3", activeCls(active))}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
            {!collapsed && !s.live && (
              <span className="ms-auto rounded-full bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {t("soon")}
              </span>
            )}
          </Link>
        );
      })}

      {collapsed ? (
        <Popover open={flyoutOpen} onOpenChange={setFlyoutOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                title={t("rbacGroup")}
                aria-label={t("rbacGroup")}
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
            <Shield className="size-4 shrink-0" />
          </PopoverTrigger>
          <PopoverContent side="inline-end" align="start" sideOffset={10} className="w-56 gap-1 p-1">
            <div className="px-2 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("rbacGroup")}
            </div>
            <div className="flex flex-col gap-0.5">
              {RBAC_ITEMS.map((item) => {
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
      ) : (
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={cn(
              LINK_BASE,
              "w-full px-3",
              groupActive
                ? "text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Shield className="size-4 shrink-0" />
            <span className="truncate">{t("rbacGroup")}</span>
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
                {RBAC_ITEMS.map((item) => {
                  const active = isActive(pathname, item.href);
                  const label = t(item.key);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(LINK_BASE, "ps-9 pe-3", activeCls(active))}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
