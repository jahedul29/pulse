export type ActionResult = "success" | "failure" | "partial";

export const TARGET_SERVICES = ["USER_MANAGEMENT", "ORDERS", "FINANCIAL", "NOTIFICATIONS", "CONTENT", "SELF"] as const;
export type ActionSeverity = "info" | "warning" | "critical";

export interface ActionInput {
  key: string;
  label: string;
  value: string;
}

export interface TargetUser {
  id?: string;
  name: string;
  username?: string;
  email?: string;
}

export interface AdminAction {
  id: string;
  createdAt: number;
  actorId: string;
  actorName: string;
  actionName: string;
  entity: string;
  targetType?: string;
  targetId?: string;
  service?: string;
  serviceLabel?: string;
  targetUser: TargetUser | null;
  summary: string;
  payloadName?: string | null;
  permissionNames: string[];
  roleNames: string[];
  result: string;
  severity: string;
  correlationId?: string;
  ipHash?: string;
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
  action: AdminAction | null;
  actorId: string | null;
  actorName: string;
  actorEmail?: string;
  actorUsername?: string;
  schema?: string;
  table: string;
  recordId: string;
  operation: string;
  changes: ColumnChange[];
  prevRowHash: string | null;
  rowHash: string | null;
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
