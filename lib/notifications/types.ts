export type MessageCategory = "validation" | "edr" | "system" | "auth";
export type RecipientRole = "client" | "rbt" | "sltot" | "bcba";
export type DeliveryStatus = "delivered" | "failed" | "pending";
export type Urgency = "low" | "medium" | "high";

export const RECIPIENT_ROLES: RecipientRole[] = ["client", "rbt", "sltot", "bcba"];
export const MESSAGE_CATEGORIES: MessageCategory[] = ["validation", "edr", "system", "auth"];
export const DELIVERY_STATUSES: DeliveryStatus[] = ["delivered", "failed", "pending"];
export const URGENCIES: Urgency[] = ["low", "medium", "high"];

export interface MessageTemplate {
  code: string;
  category: MessageCategory;
  en: string;
  ar: string;
  updatedAt: number;
}

export interface EventMapping {
  eventId: string;
  eventName: string;
  recipients: Record<RecipientRole, boolean>;
  templateByRole: Partial<Record<RecipientRole, string>>;
}

export interface NotificationLogEntry {
  id: string;
  createdAt: number;
  recipientName: string;
  recipientRole: RecipientRole;
  category: MessageCategory;
  templateCode: string;
  status: DeliveryStatus;
}

export interface AlertRouting {
  eventId: string;
  eventName: string;
  recipients: Record<RecipientRole, boolean>;
  generatesTicket: boolean;
  urgency: Urgency;
}

export interface LiveAlert {
  id: string;
  eventId: string;
  eventName: string;
  severity: Urgency;
  firedAt: number;
  summary: string;
}

export interface NotificationLogQuery {
  dateFrom?: number | null;
  dateTo?: number | null;
  roles?: RecipientRole[];
  categories?: MessageCategory[];
  statuses?: DeliveryStatus[];
}
