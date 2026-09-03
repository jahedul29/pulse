import { seedActions, seedChanges } from "./mock";
import { maskColumnValue, maskInputValue } from "@/lib/audit/mask";
import type { AdminAction, ChangeLogEntry, ActionQuery, ChangeQuery } from "./types";

const ACTIONS = seedActions();
const CHANGES = seedChanges();
const ACTION_NAME = new Map(ACTIONS.map((action) => [action.id, action.actionName]));
const SERVICE_OPTIONS = [...new Set(ACTIONS.map((action) => action.service))].sort();
const TABLE_OPTIONS = [...new Set(CHANGES.map((change) => change.table))].sort();

function maskAction(action: AdminAction): AdminAction {
  return {
    ...action,
    inputs: action.inputs.map((input) => ({ ...input, value: maskInputValue(input.label, input.value) })),
  };
}

function maskChange(change: ChangeLogEntry): ChangeLogEntry {
  return {
    ...change,
    changes: change.changes.map((columnChange) => ({
      ...columnChange,
      before: maskColumnValue(columnChange.column, columnChange.before),
      after: maskColumnValue(columnChange.column, columnChange.after),
    })),
  };
}

export async function fetchAdminActions(query: ActionQuery = {}): Promise<AdminAction[]> {
  const { dateFrom, dateTo, results, severities } = query;
  return ACTIONS.filter((action) => dateFrom == null || action.createdAt >= dateFrom)
    .filter((action) => dateTo == null || action.createdAt <= dateTo)
    .filter((action) => !results || results.length === 0 || results.includes(action.result))
    .filter((action) => !severities || severities.length === 0 || severities.includes(action.severity))
    .sort((first, second) => second.createdAt - first.createdAt)
    .map(maskAction);
}

export async function fetchChangeLog(query: ChangeQuery = {}): Promise<ChangeLogEntry[]> {
  const { actionId, operations, tables } = query;
  return CHANGES.filter((change) => !actionId || change.actionId === actionId)
    .filter((change) => !operations || operations.length === 0 || operations.includes(change.operation))
    .filter((change) => !tables || tables.length === 0 || tables.includes(change.table))
    .sort((first, second) => second.createdAt - first.createdAt)
    .map(maskChange);
}

export async function fetchActionDetail(id: string): Promise<AdminAction | null> {
  const action = ACTIONS.find((candidate) => candidate.id === id);
  return action ? maskAction(action) : null;
}

export async function fetchChangeDetail(id: string): Promise<ChangeLogEntry | null> {
  const change = CHANGES.find((candidate) => candidate.id === id);
  return change ? maskChange(change) : null;
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
