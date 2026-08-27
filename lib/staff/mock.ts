import type { StaffRecord } from "./types";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const DEPARTMENTS = ["Operations", "Support", "Finance", "Clinical", "Content", "People"];
const TITLES = [
  "Operations Lead",
  "Support Specialist",
  "Finance Analyst",
  "Care Coordinator",
  "Content Manager",
  "People Partner",
];

const NAMES: string[] = [
  "Dana Okonkwo",
  "Sam Al-Rashid",
  "Mara Devlin",
  "Theo Nakamura",
  "Priya Nair",
  "Omar Haddad",
  "Lena Fischer",
  "Yuki Tanaka",
  "Carlos Mendes",
  "Aisha Bello",
  "Noah Weiss",
  "Sofia Rossi",
  "Ivan Petrov",
  "Grace Kim",
  "Hassan Ali",
  "Emma Novak",
  "Diego Silva",
  "Fatima Zahra",
  "Liam O'Brien",
  "Nadia Kaur",
  "Marcus Cole",
  "Elena Popova",
  "Tariq Aziz",
  "Chloe Martin",
  "Ravi Menon",
  "Julia Berg",
  "Kofi Mensah",
  "Mei Lin",
  "Andre Dubois",
  "Sara Haugen",
  "Bruno Costa",
  "Iris Vaughn",
  "Paolo Bianchi",
  "Zara Sheikh",
  "Felix Braun",
  "Nora Lund",
  "Sana Qureshi",
  "Victor Reyes",
  "Hana Kobayashi",
  "Owen Clark",
];

const TERMINATED_IDS = new Set(["st-5", "st-34"]);

function emailFor(name: string): string {
  const [first, ...rest] = name.toLowerCase().replace(/[’']/g, "").split(" ");
  const last = rest.join("");
  return `${first}.${last}@abapro.health`;
}

export function seedStaff(): StaffRecord[] {
  return NAMES.map((name, i) => {
    const id = `st-${i + 1}`;
    return {
      id,
      name,
      email: emailFor(name),
      initials: initialsOf(name),
      title: TITLES[i % TITLES.length],
      department: DEPARTMENTS[i % DEPARTMENTS.length],
      terminated: TERMINATED_IDS.has(id),
    };
  });
}
