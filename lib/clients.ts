import type { Client } from "@/lib/types";

export interface ClientInput {
  fullName: string;
  email: string;
  phone: string;
  gender: "Female" | "Male";
  dob: string;
  nationality: string;
  region: string;
  countryRegistration: string;
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function computeAge(dob: string): number {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
}

function digits(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function createClient(input: ClientInput): Client {
  return {
    id: crypto.randomUUID(),
    refCode: `PL-${digits(4)}`,
    systemId: `SYS${digits(6)}`,
    fullName: input.fullName.trim(),
    initials: initialsOf(input.fullName),
    email: input.email.trim(),
    phone: input.phone.trim(),
    gender: input.gender,
    dob: input.dob,
    age: computeAge(input.dob),
    nationality: input.nationality,
    countryResidence: "United States",
    countryRegistration: input.countryRegistration,
    status: "active",
    signedIn: false,
    hasProfile: false,
    activePackage: false,
    policiesAccepted: false,
    biometrics: false,
    region: input.region,
    joinedAt: today(),
    wallet: { balance: 0, bonus: 0, gift: 0, forfeit: 0, transactions: [] },
    bankCards: [],
    notifications: [],
    adminNotes: [],
    profiles: [],
  };
}
