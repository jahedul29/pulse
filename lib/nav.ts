import {
  Users,
  Briefcase,
  TicketPercent,
  ClipboardList,
  LifeBuoy,
  LayoutTemplate,
  type LucideIcon,
} from "lucide-react";

export interface NavSection {
  slug: string;
  label: string;
  icon: LucideIcon;
  live: boolean;
  note?: string;
}

export const SECTIONS: NavSection[] = [
  { slug: "personnel", label: "Personnel", icon: Briefcase, live: false },
  { slug: "discounts", label: "Discounts & campaigns", icon: TicketPercent, live: false },
  { slug: "clients", label: "Clients & Profiles", icon: Users, live: true },
  { slug: "orders", label: "Orders", icon: ClipboardList, live: false, note: "Calendar of services lives here" },
  { slug: "events", label: "Events & Tickets", icon: LifeBuoy, live: false },
  { slug: "content", label: "Content management", icon: LayoutTemplate, live: false },
];
