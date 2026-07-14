export type Period = "D" | "W" | "M" | "3M" | "6M" | "12M" | "YTD";

export type SpecialistType =
  | "Orthopedic doctor"
  | "Physiotherapist"
  | "Chiropractor"
  | "Nutritionist";

export type AccountStatus = "active" | "suspended" | "deleted";

export type ServiceKey =
  | "physioTherapy"
  | "physioSupervision"
  | "orthoAssessment"
  | "orthoIntake";

export type ServiceUnit = "hours" | "procedures";

export interface ServiceBalance {
  key: ServiceKey;
  label: string;
  unit: ServiceUnit;
  paid: number;
  available: number;
  used: number;
  canceled: number;
}

export interface UsageRow {
  scope: "Active packages" | "Expired packages" | "Total";
  completed: number;
  scheduled: number;
  canceled: number;
}

export interface AssignedSpecialist {
  type: SpecialistType;
  name: string;
  active: boolean;
}

export interface GeoPoint {
  address: string;
  region: string;
  lat: number;
  lng: number;
}

export interface Profile {
  id: string;
  name: string;
  gender: "Female" | "Male";
  dob: string;
  age: number;
  primaryLanguage: string;
  secondaryLanguage?: string;
  location: GeoPoint;
  onlineAvailable: boolean;
  createdAt: string;
  specialists: AssignedSpecialist[];
  balances: ServiceBalance[];
  usage: UsageRow[];
}

export interface WalletTxn {
  date: string;
  kind: "Top-up" | "Charge" | "Refund" | "Bonus" | "Gift";
  amount: number;
}

export interface BankCard {
  brand: "Visa" | "Mastercard" | "Amex";
  last4: string;
  isDefault: boolean;
}

export interface Notification {
  date: string;
  text: string;
  read: boolean;
}

export interface AdminNote {
  adminId: string;
  adminName: string;
  date: string;
  text: string;
}

export interface Client {
  id: string;
  refCode: string;
  systemId: string;
  fullName: string;
  initials: string;
  email: string;
  phone: string;
  altPhone?: string;
  gender: "Female" | "Male";
  dob: string;
  age: number;
  nationality: string;
  countryResidence: string;
  countryRegistration: string;
  status: AccountStatus;
  signedIn: boolean;
  hasProfile: boolean;
  activePackage: boolean;
  policiesAccepted: boolean;
  biometrics: boolean;
  region: string;
  joinedAt: string;
  wallet: {
    balance: number;
    bonus: number;
    gift: number;
    forfeit: number;
    transactions: WalletTxn[];
  };
  bankCards: BankCard[];
  notifications: Notification[];
  adminNotes: AdminNote[];
  profiles: Profile[];
}

export interface Territory {
  region: string;
  clients: number;
  pct: number;
  lat: number;
  lng: number;
}

export interface Kpi {
  key: string;
  label: string;
  hint: string;
  values: Record<Period, number>;
  deltas: Record<Period, number>;
  trends: Record<Period, { label: string; value: number }[]>;
}

export interface SplitDatum {
  name: string;
  value: number;
  fill: string;
}
