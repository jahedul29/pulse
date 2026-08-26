"use client";

import { ChevronRight, Menu, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/nav";
import { LocaleSwitcher } from "@/components/nav/locale-switcher";
import { ProfileMenu } from "@/components/nav/profile-menu";
import { useClientStore } from "@/lib/store";
import { useSpecialistStore } from "@/lib/specialists";
import { useUiStore } from "@/lib/ui-store";

type Crumb = { label: string; href?: string };

const ADMIN_TITLE_KEYS: Record<string, string> = {
  "/admin/audit/logins": "nav.loginAudit",
  "/admin/accounts": "adminAccounts.title",
  "/admin/settings/sessions": "sessions.title",
  "/admin/roles": "rbac.rolesTitle",
  "/admin/access": "rbac.accessTitle",
  "/admin/audit/actions": "actionLog.title",
  "/admin/audit/changes": "changeLog.title",
  "/admin/settings/security": "securityPolicy.title",
  "/admin/notifications/templates": "notifications.templates.title",
  "/admin/notifications/mapping": "notifications.mapping.title",
  "/admin/notifications/log": "notifications.log.title",
  "/admin/notifications/routing": "notifications.routing.title",
  "/admin/notifications/alerts": "notifications.alerts.title",
};

export function Topbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const setMobileOpen = useUiStore((s) => s.setMobileOpen);

  const segments = pathname.split("/").filter(Boolean);
  const section = SECTIONS.find((s) => s.slug === segments[0]) ?? SECTIONS[2];
  const sectionLabel = t(`nav.sections.${section.slug}`);
  const detailId = segments[1];

  const specialistName = useSpecialistStore((s) =>
    section.slug === "personnel" && detailId
      ? s.specialists.find((x) => x.id === detailId)?.name
      : undefined,
  );
  const clientName = useClientStore((s) =>
    section.slug === "clients" && detailId
      ? s.clients.find((c) => c.id === detailId)?.fullName
      : undefined,
  );
  const detailName = detailId
    ? (specialistName ?? clientName ?? t("nav.details"))
    : undefined;

  let adminTrail: Crumb[] | undefined;
  if (pathname.startsWith("/admin/roles/")) {
    adminTrail = [
      { label: t("rbac.rolesTitle"), href: "/admin/roles" },
      { label: t("rbac.matrixTitle") },
    ];
  } else if (ADMIN_TITLE_KEYS[pathname]) {
    adminTrail = [{ label: t(ADMIN_TITLE_KEYS[pathname]) }];
  }

  const trail: Crumb[] = [{ label: t("common.appName"), href: "/" }];
  if (adminTrail) {
    trail.push(...adminTrail);
  } else if (detailName) {
    trail.push({ label: sectionLabel, href: `/${section.slug}` });
    trail.push({ label: detailName });
  } else {
    trail.push({ label: sectionLabel });
  }

  const title = adminTrail ? adminTrail[adminTrail.length - 1].label : (detailName ?? sectionLabel);

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-5">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label={t("nav.openMenu")}
        className="grid size-9 cursor-pointer place-items-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="me-auto min-w-0">
        <div className="truncate font-heading text-lg leading-tight font-semibold">{title}</div>
        <nav
          aria-label="Breadcrumb"
          className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
        >
          {trail.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && (
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/60 rtl:-scale-x-100" />
              )}
              {c.href ? (
                <Link href={c.href} className="truncate transition-colors hover:text-primary">
                  {c.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <label className="relative hidden items-center md:flex">
        <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
        <input
          type="search"
          placeholder={t("nav.search")}
          className="h-9 w-56 rounded-lg border bg-card pe-3 ps-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </label>
      <LocaleSwitcher />
      <ProfileMenu />
    </header>
  );
}
