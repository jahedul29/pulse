import { accountName, toEpoch, type AdminAccountRef } from "@/lib/audit/dto";
import { maskColumnValue, maskInputValue } from "@/lib/audit/mask";
import { deviceLabelFromUA } from "@/lib/device";
import type { ActionInput, AdminAction, ChangeLogEntry, ColumnChange } from "./types";

export interface AdminActionLogDto {
  id: string;
  admin_account_id?: string | null;
  admin_account?: AdminAccountRef | null;
  action_code: string;
  target_service: string;
  target_type?: string | null;
  target_id?: string | null;
  target_summary?: string | null;
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
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  changed_columns?: string[] | null;
  actor_admin_id?: string | null;
  actor?: AdminAccountRef | null;
  admin_action_log_id?: string | null;
  admin_action_log?: AdminActionLogDto | null;
  created_at?: string | null;
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

export function humanizeLabel(path: string): string {
  return path.split(".").map(titleizeSegment).join(" · ");
}

export function flattenPayload(value: unknown, prefix = ""): ActionInput[] {
  if (value === null || value === undefined) {
    return prefix ? [{ label: humanizeLabel(prefix), value: "-" }] : [];
  }
  if (typeof value !== "object") {
    return [{ label: humanizeLabel(prefix), value: maskInputValue(prefix, stringifyLeaf(value)) }];
  }
  if (Array.isArray(value)) {
    const allPrimitive = value.every((item) => item === null || typeof item !== "object");
    if (allPrimitive) {
      const joined = value.map((item) => stringifyLeaf(item)).join(", ");
      return [{ label: humanizeLabel(prefix), value: maskInputValue(prefix, joined) }];
    }
    return value.flatMap((item, index) => flattenPayload(item, `${prefix}[${index}]`));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    flattenPayload(nested, prefix ? `${prefix}.${key}` : key),
  );
}

export function actionDtoToRow(dto: AdminActionLogDto): AdminAction {
  return {
    id: dto.id,
    createdAt: toEpoch(dto.created_at),
    actorId: dto.admin_account_id ?? "",
    actorName: accountName(dto.admin_account) ?? "System",
    actionName: dto.action_code,
    service: dto.target_service,
    entity: entityLabel(dto),
    targetType: dto.target_type ?? "",
    targetId: dto.target_id ?? "",
    summary: dto.target_summary ?? "",
    result: dto.result,
    severity: dto.severity,
    correlationId: dto.correlation_id ?? "",
    adminEmail: dto.admin_account?.email ?? "",
    device: dto.user_agent ? deviceLabelFromUA(dto.user_agent) : "",
    ticketType: null,
    ticketId: null,
    inputs: [],
  };
}

export function actionDtoToDetail(dto: AdminActionLogDto): AdminAction {
  return { ...actionDtoToRow(dto), inputs: flattenPayload(dto.request_payload) };
}

function deriveChanges(dto: ChangeLogDto): ColumnChange[] {
  const oldData = dto.old_data ?? {};
  const newData = dto.new_data ?? {};
  const columns =
    dto.changed_columns && dto.changed_columns.length
      ? dto.changed_columns
      : Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
  return columns.map((column) => ({
    column,
    before: maskColumnValue(column, cellValue(oldData[column])),
    after: maskColumnValue(column, cellValue(newData[column])),
  }));
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
    actionTarget: action ? entityLabel(action) : null,
    actorName: accountName(dto.actor) ?? "System",
    schema: dto.schema_name ?? "",
    table: dto.table_name,
    recordId: dto.row_pk,
    operation: dto.operation,
    changes: deriveChanges(dto),
  };
}

export function changeDtoToDetail(dto: ChangeLogDto): ChangeLogEntry {
  return changeDtoToRow(dto);
}
