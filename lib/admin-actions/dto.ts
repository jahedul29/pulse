import { accountName, toEpoch, type AdminAccountRef } from "@/lib/audit/dto";
import { maskColumnValue, maskInputValue } from "@/lib/audit/mask";
import { deviceLabelFromUA } from "@/lib/device";
import type { ActionInput, AdminAction, ChangeLogEntry, ColumnChange, HashChainStatus, TargetUser } from "./types";

export interface TargetUserDto {
  id?: string;
  full_name?: string | null;
  real_name?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface AdminActionLogDto {
  id: string;
  admin_account_id?: string | null;
  admin_account?: AdminAccountRef | null;
  action_code: string;
  action_label?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  target_summary?: string | null;
  target_user?: TargetUserDto | null;
  permission_names?: string[] | null;
  role_names?: string[] | null;
  request_payload?: unknown;
  result: string;
  severity: string;
  correlation_id?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
}

export interface ChangeLogDto {
  id: string;
  schema_name?: string | null;
  table_name: string;
  row_pk: string;
  operation: string;
  old_data?: Record<string, unknown> | unknown[] | null;
  new_data?: Record<string, unknown> | unknown[] | null;
  changed_columns?: string[] | null;
  actor_admin_id?: string | null;
  actor?: AdminAccountRef | null;
  admin_action_log_id?: string | null;
  admin_action_log?: AdminActionLogDto | null;
  prev_row_hash?: string | null;
  row_hash?: string | null;
  created_at?: string | null;
}

function targetUserOf(dto: TargetUserDto | null | undefined): TargetUser | null {
  if (!dto) return null;
  const name = dto.full_name?.trim() || dto.real_name?.trim() || dto.email?.trim();
  if (!name) return null;
  return {
    id: dto.id || undefined,
    name,
    username: dto.username?.trim() || undefined,
    email: dto.email?.trim() || undefined,
  };
}

function nameList(values: string[] | null | undefined): string[] {
  return (values ?? []).filter((value) => typeof value === "string" && value.trim() !== "");
}

function entityLabel(dto: AdminActionLogDto): string {
  return [dto.target_type, dto.target_id].filter(Boolean).join(" · ");
}

function stringifyLeaf(value: unknown): string {
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower === "id") return "ID";
  if (lower === "ids") return "IDs";
  return word;
}

function titleizeSegment(segment: string): string {
  if (/^[A-Z0-9]{2,}$/.test(segment)) return segment;
  const words = segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return segment;
  return words
    .map((word, index) => {
      const mapped = humanizeWord(word);
      if (mapped !== word) return mapped;
      return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
    .join(" ");
}

export function humanizeCode(code: string | null | undefined): string {
  const words = (code ?? "").trim().toLowerCase().split(/[_\s]+/).filter(Boolean);
  if (!words.length) return "";
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function humanizeLabel(path: string): string {
  return path.split(".").map(titleizeSegment).join(" · ");
}

export function flattenPayload(value: unknown, prefix = ""): ActionInput[] {
  if (value === null || value === undefined) {
    return prefix ? [{ key: prefix, label: humanizeLabel(prefix), value: "-" }] : [];
  }
  if (typeof value !== "object") {
    return [{ key: prefix, label: humanizeLabel(prefix), value: maskInputValue(prefix, stringifyLeaf(value)) }];
  }
  if (Array.isArray(value)) {
    const allPrimitive = value.every((item) => item === null || typeof item !== "object");
    if (allPrimitive) {
      const joined = value.map((item) => stringifyLeaf(item)).join(", ");
      return [{ key: prefix, label: humanizeLabel(prefix), value: maskInputValue(prefix, joined) }];
    }
    return value.flatMap((item, index) => flattenPayload(item, `${prefix}[${index}]`));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    flattenPayload(nested, prefix ? `${prefix}.${key}` : key),
  );
}

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function payloadName(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const name = record.name;
  if (name && typeof name === "object" && !Array.isArray(name)) {
    const localized = name as Record<string, unknown>;
    return textOf(localized.EN) ?? textOf(localized.AR) ?? textOf(record.code);
  }
  return textOf(name) ?? textOf(record.code);
}

export function actionDtoToRow(dto: AdminActionLogDto): AdminAction {
  return {
    id: dto.id,
    createdAt: toEpoch(dto.created_at),
    actorId: dto.admin_account_id ?? "",
    actorName: accountName(dto.admin_account) ?? "System",
    actionName: dto.action_label || dto.action_code,
    entity: entityLabel(dto),
    targetType: dto.target_type ?? "",
    targetId: dto.target_id ?? "",
    targetUser: targetUserOf(dto.target_user),
    summary: dto.target_summary ?? "",
    payloadName: payloadName(dto.request_payload),
    permissionNames: nameList(dto.permission_names),
    roleNames: nameList(dto.role_names),
    result: dto.result,
    severity: dto.severity,
    correlationId: dto.correlation_id ?? "",
    adminEmail: dto.admin_account?.email ?? "",
    device: dto.user_agent ? deviceLabelFromUA(dto.user_agent) : "",
    inputs: [],
  };
}

export function meaningfulInputs(action: AdminAction): ActionInput[] {
  return action.inputs.filter((input) => {
    if (input.key === "id" && action.targetId && input.value === action.targetId) return false;
    if (input.key === "permission_ids" && action.permissionNames.length > 0) return false;
    if (input.key === "role_ids" && action.roleNames.length > 0) return false;
    return true;
  });
}

export function actionDtoToDetail(dto: AdminActionLogDto): AdminAction {
  return { ...actionDtoToRow(dto), inputs: flattenPayload(dto.request_payload) };
}

const PSEUDO_COLUMN = /^\d+$/;

function rowData(value: Record<string, unknown> | unknown[] | null | undefined): Record<string, unknown> {
  return value && !Array.isArray(value) && typeof value === "object" ? value : {};
}

function deriveChanges(dto: ChangeLogDto): ColumnChange[] {
  const oldData = rowData(dto.old_data);
  const newData = rowData(dto.new_data);
  const columns = (
    dto.changed_columns && dto.changed_columns.length
      ? dto.changed_columns
      : Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]))
  ).filter(
    (column) =>
      !PSEUDO_COLUMN.test(column) &&
      !(column === "id" && [oldData.id, newData.id].every((value) => value == null || String(value) === dto.row_pk)),
  );
  return columns.map((column) => ({
    column,
    before: maskColumnValue(column, cellValue(oldData[column])),
    after: maskColumnValue(column, cellValue(newData[column])),
  }));
}

export function hashChainStatus(dto: Pick<ChangeLogDto, "prev_row_hash" | "row_hash">): HashChainStatus {
  if (!dto.row_hash) return "missing";
  return dto.prev_row_hash ? "linked" : "first";
}

function cellValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function changeDtoToRow(dto: ChangeLogDto): ChangeLogEntry {
  const action = dto.admin_action_log ?? null;
  return {
    id: dto.id,
    createdAt: toEpoch(dto.created_at),
    actionId: dto.admin_action_log_id ?? null,
    actionCode: action?.action_code ?? null,
    action: action ? actionDtoToDetail(action) : null,
    actorId: dto.actor?.id ?? dto.actor_admin_id ?? null,
    actorName: accountName(dto.actor) ?? "System",
    actorEmail: dto.actor?.email ?? undefined,
    actorUsername: dto.actor?.username?.trim() || undefined,
    schema: dto.schema_name ?? "",
    table: dto.table_name,
    recordId: dto.row_pk,
    operation: dto.operation,
    changes: deriveChanges(dto),
    chain: hashChainStatus(dto),
  };
}

export function changeDtoToDetail(dto: ChangeLogDto): ChangeLogEntry {
  return changeDtoToRow(dto);
}
