export type MessageCategory = "validation" | "edr" | "system" | "auth";
export type RecipientRole = "client" | "rbt" | "sltot" | "bcba";

export const RECIPIENT_ROLES: RecipientRole[] = ["client", "rbt", "sltot", "bcba"];

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
