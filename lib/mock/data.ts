import type {
  Client,
  Kpi,
  Period,
  Profile,
  ServiceBalance,
  SpecialistType,
  SplitDatum,
  Territory,
} from "@/lib/types";
import { PERIODS } from "@/lib/period";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260714);

function pick<T>(list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function between(min: number, max: number): number {
  return Math.round(min + rng() * (max - min));
}

function money(min: number, max: number): number {
  return Math.round((min + rng() * (max - min)) * 100) / 100;
}

const REGIONS = [
  { region: "Midtown", lat: 40.7549, lng: -73.984 },
  { region: "Financial District", lat: 40.7075, lng: -74.0113 },
  { region: "Upper East Side", lat: 40.7736, lng: -73.9566 },
  { region: "Harlem", lat: 40.8116, lng: -73.9465 },
  { region: "Williamsburg", lat: 40.7081, lng: -73.9571 },
  { region: "Downtown Brooklyn", lat: 40.6923, lng: -73.986 },
  { region: "Long Island City", lat: 40.7447, lng: -73.9485 },
  { region: "Astoria", lat: 40.7644, lng: -73.9235 },
];

const FEMALE = [
  "Emma", "Olivia", "Sophia", "Mia", "Isabella", "Ava", "Camila", "Aaliyah", "Mei", "Priya",
  "Sofia", "Maya", "Hannah", "Grace", "Zoe", "Layla", "Chloe", "Amara", "Nina", "Leila",
];

const MALE = [
  "Liam", "Noah", "Ethan", "Mason", "Diego", "Elijah", "James", "Daniel", "Marcus", "Omar",
  "Lucas", "David", "Aiden", "Jamal", "Adam", "Carlos", "Jonas", "Marco", "Ali", "Ryan",
];

function person(): { first: string; gender: "Female" | "Male" } {
  const gender = rng() > 0.5 ? "Female" : "Male";
  return { first: pick(gender === "Female" ? FEMALE : MALE), gender };
}

const LAST = [
  "Smith", "Johnson", "Williams", "Brown", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Lee", "Nguyen", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Patel", "Kim", "Reyes",
];

const LANGUAGES = ["English", "Spanish", "Mandarin", "Tagalog", "Vietnamese", "French", "Korean"];
const NATIONS = ["United States", "Mexico", "India", "China", "Canada", "United Kingdom", "Philippines", "Brazil"];
const CARDS: Client["bankCards"][number]["brand"][] = ["Visa", "Mastercard", "Amex"];

const NOTIFICATIONS = [
  "Session confirmed with your physiotherapist",
  "Your therapy package expires in 7 days",
  "Payment receipt is ready to view",
  "Assessment results have been shared",
  "A specialist was reassigned to your profile",
  "Reminder: intake appointment tomorrow",
];

const ADMINS = [
  { id: "A-101", name: "Dana Fields" },
  { id: "A-114", name: "Ryan Mercer" },
  { id: "A-127", name: "Priya Shah" },
];

const ADMIN_NOTES = [
  "Called to confirm package renewal, awaiting response.",
  "Requested refund review for a canceled session.",
  "Verified identity documents, all in order.",
  "Escalated wallet discrepancy to finance.",
  "Client asked to switch preferred specialist.",
];

const SPECIALIST_NAMES: Record<SpecialistType, string[]> = {
  "Orthopedic doctor": ["Dr. Ivan Petrov", "Dr. Rania Haddad", "Dr. Leo Marín"],
  Physiotherapist: ["Ana Sørensen", "Marcus Webb", "Yara Nassar"],
  Chiropractor: ["Dr. Sam Cole", "Dr. Priya Nair"],
  Nutritionist: ["Elif Demir", "Jonah Reed"],
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function dobFor(age: number): string {
  const year = 2026 - age;
  const month = between(1, 12).toString().padStart(2, "0");
  const day = between(1, 28).toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildBalances(): ServiceBalance[] {
  const defs: [ServiceBalance["key"], string, ServiceBalance["unit"], number][] = [
    ["physioTherapy", "Physio Therapy", "hours", between(10, 40)],
    ["physioSupervision", "Physio Supervision", "hours", between(4, 20)],
    ["orthoAssessment", "Orthopedic Assessment", "procedures", between(1, 4)],
    ["orthoIntake", "Orthopedic Intake", "procedures", between(1, 3)],
  ];
  return defs.map(([key, label, unit, paid]) => {
    const used = between(0, paid);
    const canceled = between(0, Math.max(0, paid - used));
    return { key, label, unit, paid, available: paid - used - canceled, used, canceled };
  });
}

function buildSpecialists(): Profile["specialists"] {
  const types: SpecialistType[] = [
    "Orthopedic doctor",
    "Physiotherapist",
    "Chiropractor",
    "Nutritionist",
  ];
  return types.map((type) => ({
    type,
    name: pick(SPECIALIST_NAMES[type]),
    active: rng() > 0.35,
  }));
}

function buildProfile(index: number, surname: string): Profile {
  const { first, gender } = person();
  const age = between(6, 74);
  const region = pick(REGIONS);
  const name = `${first} ${surname}`;
  const balances = buildBalances();
  const sum = (fn: (b: ServiceBalance) => number) => balances.reduce((a, b) => a + fn(b), 0);
  const usedTotal = sum((b) => b.used);
  const canceledTotal = sum((b) => b.canceled);
  const activeCompleted = Math.round(usedTotal * 0.7);
  return {
    id: `p${index}`,
    name,
    gender,
    dob: dobFor(age),
    age,
    primaryLanguage: pick(LANGUAGES),
    secondaryLanguage: rng() > 0.5 ? pick(LANGUAGES) : undefined,
    location: {
      address: `${between(10, 990)} ${region.region} St`,
      region: region.region,
      lat: region.lat + (rng() - 0.5) * 0.02,
      lng: region.lng + (rng() - 0.5) * 0.02,
    },
    onlineAvailable: rng() > 0.4,
    createdAt: `2025-${between(1, 12).toString().padStart(2, "0")}-${between(1, 28)
      .toString()
      .padStart(2, "0")}`,
    specialists: buildSpecialists(),
    balances,
    usage: [
      {
        scope: "Active packages",
        completed: activeCompleted,
        scheduled: between(1, 8),
        canceled: Math.round(canceledTotal * 0.6),
      },
      {
        scope: "Expired packages",
        completed: usedTotal - activeCompleted,
        scheduled: 0,
        canceled: canceledTotal - Math.round(canceledTotal * 0.6),
      },
      {
        scope: "Total",
        completed: usedTotal,
        scheduled: between(1, 8),
        canceled: canceledTotal,
      },
    ],
  };
}

function buildClient(index: number): Client {
  const surname = pick(LAST);
  const { first, gender } = person();
  const fullName = `${first} ${surname}`;
  const age = between(21, 68);
  const region = pick(REGIONS);
  const roll = rng();
  const status: Client["status"] = roll > 0.92 ? "deleted" : roll > 0.83 ? "suspended" : "active";
  const profileCount = status === "deleted" ? 0 : between(1, 3);
  const profiles = Array.from({ length: profileCount }, (_, i) =>
    buildProfile(index * 10 + i, surname),
  );
  const cardCount = between(1, 2);
  return {
    id: `c${(index + 1).toString().padStart(3, "0")}`,
    refCode: `PL-${between(1000, 9999)}`,
    systemId: `SYS${between(100000, 999999)}`,
    fullName,
    initials: initials(fullName),
    email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@mail.com`,
    phone: `+1 (${between(201, 989)}) ${between(200, 999)}-${between(1000, 9999)}`,
    altPhone:
      rng() > 0.6 ? `+1 (${between(201, 989)}) ${between(200, 999)}-${between(1000, 9999)}` : undefined,
    gender,
    dob: dobFor(age),
    age,
    nationality: pick(NATIONS),
    countryResidence: "United States",
    countryRegistration: pick(NATIONS),
    status,
    signedIn: rng() > 0.5,
    hasProfile: profileCount > 0,
    activePackage: status === "active" && rng() > 0.3,
    policiesAccepted: rng() > 0.15,
    biometrics: rng() > 0.5,
    region: region.region,
    joinedAt: `2024-${between(1, 12).toString().padStart(2, "0")}-${between(1, 28)
      .toString()
      .padStart(2, "0")}`,
    wallet: {
      balance: money(0, 1600),
      bonus: money(0, 200),
      gift: rng() > 0.7 ? money(20, 150) : 0,
      forfeit: rng() > 0.75 ? money(10, 120) : 0,
      transactions: Array.from({ length: between(3, 6) }, () => ({
        date: `2026-0${between(1, 7)}-${between(1, 28).toString().padStart(2, "0")}`,
        kind: pick(["Top-up", "Charge", "Refund", "Bonus", "Gift"] as const),
        amount: money(15, 400),
      })),
    },
    bankCards: Array.from({ length: cardCount }, (_, i) => ({
      brand: pick(CARDS),
      last4: between(1000, 9999).toString(),
      isDefault: i === 0,
    })),
    notifications: Array.from({ length: between(2, 4) }, () => ({
      date: `2026-0${between(1, 7)}-${between(1, 28).toString().padStart(2, "0")}`,
      text: pick(NOTIFICATIONS),
      read: rng() > 0.4,
    })),
    adminNotes: Array.from({ length: between(1, 3) }, () => {
      const admin = pick(ADMINS);
      return {
        adminId: admin.id,
        adminName: admin.name,
        date: `2026-0${between(1, 7)}-${between(1, 28).toString().padStart(2, "0")}`,
        text: pick(ADMIN_NOTES),
      };
    }),
    profiles,
  };
}

export const clients: Client[] = Array.from({ length: 42 }, (_, i) => buildClient(i));

export function getClient(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
}

export const territories: Territory[] = (() => {
  const counts = new Map<string, number>();
  for (const c of clients) counts.set(c.region, (counts.get(c.region) ?? 0) + 1);
  const total = clients.length;
  return REGIONS.map((r) => {
    const n = counts.get(r.region) ?? 0;
    return {
      region: r.region,
      clients: n,
      pct: Math.round((n / total) * 1000) / 10,
      lat: r.lat,
      lng: r.lng,
    };
  }).sort((a, b) => b.clients - a.clients);
})();

function trend(base: number, len: number, drift: number) {
  const points: { label: string; value: number }[] = [];
  let v = base;
  for (let i = 0; i < len; i++) {
    v = Math.max(0, Math.round(v + (rng() - 0.45) * drift));
    points.push({ label: `${i + 1}`, value: v });
  }
  return points;
}

const PERIOD_STEPS: Record<Period, number> = {
  D: 12,
  W: 7,
  M: 12,
  "3M": 12,
  "6M": 12,
  "12M": 12,
  YTD: 12,
};

function buildKpi(
  key: string,
  label: string,
  hint: string,
  base: Record<Period, number>,
  drift: number,
): Kpi {
  const values = {} as Kpi["values"];
  const deltas = {} as Kpi["deltas"];
  const trends = {} as Kpi["trends"];
  for (const p of PERIODS) {
    const series = trend(Math.round(base[p] * 0.7), PERIOD_STEPS[p], drift);
    trends[p] = series;
    values[p] = base[p];
    const first = series[0].value || 1;
    const last = series[series.length - 1].value;
    deltas[p] = Math.round(((last - first) / first) * 100);
  }
  return { key, label, hint, values, deltas, trends };
}

const withProfile = clients.filter((c) => c.hasProfile).length;

export const kpis: Kpi[] = [
  buildKpi(
    "new",
    "New clients",
    "First-time registrations in period",
    { D: 38, W: 214, M: 1284, "3M": 3820, "6M": 7410, "12M": 14980, YTD: 8640 },
    120,
  ),
  buildKpi(
    "total",
    "Total clients",
    "All registered accounts",
    { D: 15980, W: 15980, M: 15980, "3M": 15980, "6M": 15980, "12M": 15980, YTD: 15980 },
    40,
  ),
  buildKpi(
    "profile",
    "With a profile",
    `${Math.round((withProfile / clients.length) * 100)}% of accounts have a profile`,
    { D: 12, W: 88, M: 940, "3M": 2810, "6M": 5230, "12M": 10120, YTD: 6040 },
    90,
  ),
  buildKpi(
    "activePkg",
    "Active packages",
    "Clients holding a live package",
    { D: 9, W: 61, M: 862, "3M": 2440, "6M": 4610, "12M": 8720, YTD: 5210 },
    70,
  ),
  buildKpi(
    "suspended",
    "Suspended",
    "Accounts currently suspended",
    { D: 2, W: 9, M: 37, "3M": 96, "6M": 172, "12M": 310, YTD: 214 },
    12,
  ),
  buildKpi(
    "deleted",
    "Deleted",
    "Accounts removed in period",
    { D: 1, W: 5, M: 21, "3M": 58, "6M": 121, "12M": 244, YTD: 150 },
    9,
  ),
];

export const packageSplit: SplitDatum[] = [
  { name: "Monthly", value: 46, fill: "var(--color-chart-1)" },
  { name: "Quarterly", value: 28, fill: "var(--color-chart-2)" },
  { name: "Weekly", value: 17, fill: "var(--color-chart-3)" },
  { name: "One-off", value: 9, fill: "var(--color-chart-5)" },
];

export const supervisionSplit: SplitDatum[] = [
  { name: "Supervised", value: 63, fill: "var(--color-chart-1)" },
  { name: "Not supervised", value: 37, fill: "var(--color-chart-3)" },
];

export const cancellationSplit: SplitDatum[] = [
  { name: "Client request", value: 41, fill: "var(--color-chart-1)" },
  { name: "No-show", value: 22, fill: "var(--color-chart-2)" },
  { name: "Late", value: 19, fill: "var(--color-chart-4)" },
  { name: "With refund", value: 18, fill: "var(--color-chart-3)" },
];
