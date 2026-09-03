"use client";

import { ChevronLeft, ChevronRight, Menu, Search } from "lucide-react";
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
  "/admin/user-management": "userManagement.title",
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
  const setMobileOpen = useUiStore((state) => state.setMobileOpen);

  const segments = pathname.split("/").filter(Boolean);
  const section = SECTIONS.find((sectionItem) => sectionItem.slug === segments[0]) ?? SECTIONS[2];
  const sectionLabel = t(`nav.sections.${section.slug}`);
  const detailId = segments[1];

  const specialistName = useSpecialistStore((state) =>
    section.slug === "personnel" && detailId
      ? state.specialists.find((x) => x.id === detailId)?.name
      : undefined,
  );
  const clientName = useClientStore((state) =>
    section.slug === "clients" && detailId
      ? state.clients.find((client) => client.id === detailId)?.fullName
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

  const backCrumb =
    trail.length > 2 && trail[trail.length - 2].href ? trail[trail.length - 2] : null;
  const desktopTrail: (Crumb & { ellipsis?: boolean })[] =
    trail.length > 4
      ? [trail[0], { label: "…", ellipsis: true }, trail[trail.length - 2], trail[trail.length - 1]]
      : trail;

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-5">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label={t("nav.openMenu")}
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="me-auto min-w-0">
        <div className="line-clamp-2 font-heading text-lg leading-tight font-semibold sm:truncate">
          {title}
        </div>
        {backCrumb && (
          <Link
            href={backCrumb.href!}
            className="mt-0.5 flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary sm:hidden"
          >
            <ChevronLeft className="size-3 shrink-0 rtl:-scale-x-100" />
            <span className="truncate">{backCrumb.label}</span>
          </Link>
        )}
        <nav
          aria-label="Breadcrumb"
          className="mt-0.5 hidden items-center gap-1 text-xs text-muted-foreground sm:flex"
        >
          {desktopTrail.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && (
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/60 rtl:-scale-x-100" />
              )}
              {crumb.ellipsis ? (
                <span className="text-muted-foreground/60">{crumb.label}</span>
              ) : crumb.href ? (
                <Link href={crumb.href} className="truncate transition-colors hover:text-primary">
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
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
      </div>
    </header>
  );
}
