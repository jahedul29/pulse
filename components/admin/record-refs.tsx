"use client";

import { Fragment, useMemo, type ReactNode } from "react";

import { Chip } from "@/components/common/chip";
import { ChipLink, InlineRecordLink } from "@/components/common/record-link";
import { fmtDateTime } from "@/lib/format";
import {
  dbDateTimeToEpoch,
  parseIdList,
  recordHref,
  referenceKind,
  targetRecordKind,
  type RecordKind,
} from "@/lib/record-links";
import { useAlertRoute, useAllTemplates, useChannels } from "@/lib/notifications/queries";
import { useRoles } from "@/lib/rbac/queries";
import { useAllAdminUsers, useInvitation } from "@/lib/user-management/queries";
import type { AdminAction } from "@/lib/admin-actions/types";

function useRoleIndex() {
  const rolesQuery = useRoles({ page: 1, perPage: 100 });
  return useMemo(() => {
    const roles = rolesQuery.data?.data ?? [];
    return {
      nameById: new Map(roles.map((role) => [String(role.id), role.name])),
      idByName: new Map(roles.map((role) => [role.name, String(role.id)])),
    };
  }, [rolesQuery.data]);
}

function joined(nodes: ReactNode[]): ReactNode {
  if (nodes.length === 0) return "-";
  return nodes.map((node, index) => (
    <Fragment key={index}>
      {index > 0 && ", "}
      {node}
    </Fragment>
  ));
}

export function RoleNameChips({ names }: { names: string[] }) {
  const { idByName } = useRoleIndex();
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name, index) => {
        const roleId = idByName.get(name);
        return roleId ? (
          <ChipLink key={`${name}-${index}`} href={recordHref("role", roleId)}>
            {name}
          </ChipLink>
        ) : (
          <Chip key={`${name}-${index}`} className="leading-snug whitespace-normal">
            {name}
          </Chip>
        );
      })}
    </div>
  );
}

export function RoleIdLinks({ ids }: { ids: string[] }) {
  const { nameById } = useRoleIndex();
  return (
    <>
      {joined(
        ids.map((roleId) => (
          <InlineRecordLink key={roleId} href={recordHref("role", roleId)}>
            {nameById.get(roleId) ?? `#${roleId}`}
          </InlineRecordLink>
        )),
      )}
    </>
  );
}

function useAdminIndex() {
  const adminsQuery = useAllAdminUsers();
  return useMemo(
    () => new Map((adminsQuery.data ?? []).map((admin) => [admin.id, admin.name || admin.email])),
    [adminsQuery.data],
  );
}

function useTemplateName(id: string): string | null {
  const templatesQuery = useAllTemplates();
  return useMemo(() => {
    const template = (templatesQuery.data ?? []).find((entry) => String(entry.id) === id);
    return template ? template.name || template.code : null;
  }, [templatesQuery.data, id]);
}

function useAlertRouteName(id: string): string | null {
  const routeQuery = useAlertRoute(Number(id) || null);
  return routeQuery.data?.name ?? null;
}

function useInvitationName(id: string): string | null {
  const invitationQuery = useInvitation(id || null);
  return invitationQuery.data?.name || invitationQuery.data?.email || null;
}

function AdminNames({ ids, fallback }: { ids: string[]; fallback: string }) {
  const nameById = useAdminIndex();
  return <>{ids.length ? ids.map((id) => nameById.get(id) ?? fallback).join(", ") : "-"}</>;
}

function RoleNames({ ids, fallback }: { ids: string[]; fallback: string }) {
  const { nameById } = useRoleIndex();
  return <>{ids.length ? ids.map((id) => nameById.get(id) ?? fallback).join(", ") : "-"}</>;
}

function TemplateName({ id, fallback }: { id: string; fallback: string }) {
  return <>{useTemplateName(id) ?? fallback}</>;
}

function AlertRouteName({ id, fallback }: { id: string; fallback: string }) {
  return <>{useAlertRouteName(id) ?? fallback}</>;
}

function InvitationName({ id, fallback }: { id: string; fallback: string }) {
  return <>{useInvitationName(id) ?? fallback}</>;
}

export function RecordName({ kind, id, fallback }: { kind: RecordKind; id: string; fallback: string }) {
  if (kind === "adminAccount") return <AdminNames ids={[id]} fallback={fallback} />;
  if (kind === "role") return <RoleNames ids={[id]} fallback={fallback} />;
  if (kind === "template") return <TemplateName id={id} fallback={fallback} />;
  if (kind === "alertRoute") return <AlertRouteName id={id} fallback={fallback} />;
  if (kind === "invitation") return <InvitationName id={id} fallback={fallback} />;
  return <>{fallback}</>;
}

export function ActionTargetName({ action, fallback }: { action: AdminAction; fallback: string }) {
  if (action.targetUser) return <>{action.targetUser.name}</>;
  const kind = targetRecordKind(action.targetType);
  if (kind && action.targetId) return <RecordName kind={kind} id={action.targetId} fallback={fallback} />;
  return <>{fallback}</>;
}

export function AdminIdLinks({ ids, fallback }: { ids: string[]; fallback: string }) {
  const nameById = useAdminIndex();
  return (
    <>
      {joined(
        ids.map((id) => (
          <InlineRecordLink key={id} href={recordHref("adminAccount", id)}>
            {nameById.get(id) ?? fallback}
          </InlineRecordLink>
        )),
      )}
    </>
  );
}

export function AdminIdLink({ id, fallback }: { id: string; fallback: string }) {
  return <AdminIdLinks ids={[id]} fallback={fallback} />;
}

function TemplateIdLink({ id, fallback }: { id: string; fallback: string }) {
  const name = useTemplateName(id);
  return <InlineRecordLink href={recordHref("template", id)}>{name ?? fallback}</InlineRecordLink>;
}

function AlertRouteIdLink({ id, fallback }: { id: string; fallback: string }) {
  const name = useAlertRouteName(id);
  return <InlineRecordLink href={recordHref("alertRoute", id)}>{name ?? fallback}</InlineRecordLink>;
}

function ChannelName({ id }: { id: string }) {
  const channelsQuery = useChannels();
  const channel = (channelsQuery.data ?? []).find((entry) => String(entry.id) === id);
  return <>{channel ? channel.name || channel.code : "-"}</>;
}

export interface ReferenceFallbacks {
  admin: string;
  template: string;
  alertRoute: string;
  role?: string;
}

export function ReferenceValue({
  fieldKey,
  value,
  locale,
  fallbacks,
  plain = false,
}: {
  fieldKey: string;
  value: string;
  locale: string;
  fallbacks: ReferenceFallbacks;
  plain?: boolean;
}) {
  const kind = referenceKind(fieldKey);
  if (!value || value === "-") return <>{value || "-"}</>;
  if (plain && kind === "admin") return <AdminNames ids={[value]} fallback={fallbacks.admin} />;
  if (plain && kind === "adminList") return <AdminNames ids={parseIdList(value)} fallback={fallbacks.admin} />;
  if (plain && kind === "roles") return <RoleNames ids={parseIdList(value)} fallback={fallbacks.role ?? "-"} />;
  if (plain && kind === "template") return <TemplateName id={value} fallback={fallbacks.template} />;
  if (plain && kind === "alertRoute") return <AlertRouteName id={value} fallback={fallbacks.alertRoute} />;
  if (kind === "admin") return <AdminIdLink id={value} fallback={fallbacks.admin} />;
  if (kind === "adminList") return <AdminIdLinks ids={parseIdList(value)} fallback={fallbacks.admin} />;
  if (kind === "roles") return <RoleIdLinks ids={parseIdList(value)} />;
  if (kind === "template") return <TemplateIdLink id={value} fallback={fallbacks.template} />;
  if (kind === "alertRoute") return <AlertRouteIdLink id={value} fallback={fallbacks.alertRoute} />;
  if (kind === "channel") return <ChannelName id={value} />;
  const epoch = dbDateTimeToEpoch(value);
  return <>{epoch == null ? value : fmtDateTime(epoch, locale)}</>;
}
