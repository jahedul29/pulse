import { seedActions, seedChanges } from "./mock";
import { maskColumnValue, maskInputValue } from "@/lib/audit/mask";
import type { AdminAction, ChangeLogEntry, ActionQuery, ChangeQuery } from "./types";

const ACTIONS = seedActions();
const CHANGES = seedChanges();
const ACTION_NAME = new Map(ACTIONS.map((a) => [a.id, a.actionName]));
const SERVICE_OPTIONS = [...new Set(ACTIONS.map((a) => a.service))].sort();
const TABLE_OPTIONS = [...new Set(CHANGES.map((c) => c.table))].sort();

function maskAction(a: AdminAction): AdminAction {
  return { ...a, inputs: a.inputs.map((i) => ({ ...i, value: maskInputValue(i.label, i.value) })) };
}

function maskChange(c: ChangeLogEntry): ChangeLogEntry {
  return {
    ...c,
    changes: c.changes.map((ch) => ({
      ...ch,
      before: maskColumnValue(ch.column, ch.before),
      after: maskColumnValue(ch.column, ch.after),
    })),
  };
}

export async function fetchAdminActions(query: ActionQuery = {}): Promise<AdminAction[]> {
  const { dateFrom, dateTo, results, severities } = query;
  return ACTIONS.filter((a) => dateFrom == null || a.createdAt >= dateFrom)
    .filter((a) => dateTo == null || a.createdAt <= dateTo)
    .filter((a) => !results || results.length === 0 || results.includes(a.result))
    .filter((a) => !severities || severities.length === 0 || severities.includes(a.severity))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(maskAction);
}

export async function fetchChangeLog(query: ChangeQuery = {}): Promise<ChangeLogEntry[]> {
  const { actionId, operations, tables } = query;
  return CHANGES.filter((c) => !actionId || c.actionId === actionId)
    .filter((c) => !operations || operations.length === 0 || operations.includes(c.operation))
    .filter((c) => !tables || tables.length === 0 || tables.includes(c.table))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(maskChange);
}

export async function fetchActionDetail(id: string): Promise<AdminAction | null> {
  const a = ACTIONS.find((x) => x.id === id);
  return a ? maskAction(a) : null;
}

export async function fetchChangeDetail(id: string): Promise<ChangeLogEntry | null> {
  const c = CHANGES.find((x) => x.id === id);
  return c ? maskChange(c) : null;
}

export function actionServiceOptions(): string[] {
  return SERVICE_OPTIONS;
}

export function changeTableOptions(): string[] {
  return TABLE_OPTIONS;
}

export function actionName(actionId: string | null): string | null {
  return actionId ? (ACTION_NAME.get(actionId) ?? null) : null;
}
