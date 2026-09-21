export type ActionResult = "success" | "failure" | "partial";
export type ActionSeverity = "info" | "warning" | "critical";

export interface ActionInput {
  label: string;
  value: string;
}

export interface AdminAction {
  id: string;
  createdAt: number;
  actorId: string;
  actorName: string;
  actionName: string;
  service: string;
  entity: string;
  targetType?: string;
  targetId?: string;
  summary: string;
  result: string;
  severity: string;
  correlationId?: string;
  adminEmail?: string;
  device?: string;
  inputs: ActionInput[];
}

export type ChangeOp = "insert" | "update" | "delete";

export interface ColumnChange {
  column: string;
  before: string | null;
  after: string | null;
}

export interface ChangeLogEntry {
  id: string;
  createdAt: number;
  actionId: string | null;
  actionCode: string | null;
  actionTarget: string | null;
  actorName: string;
  schema?: string;
  table: string;
  recordId: string;
  operation: string;
  changes: ColumnChange[];
}

export interface ActionQuery {
  dateFrom?: number | null;
  dateTo?: number | null;
  results?: ActionResult[];
  severities?: ActionSeverity[];
}

export interface ChangeQuery {
  actionId?: string | null;
  operations?: ChangeOp[];
  tables?: string[];
}
