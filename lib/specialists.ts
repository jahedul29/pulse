import { create } from "zustand";
import { configFor } from "@/lib/availability/rules";
import type { DayState, RuleConfig, SpecialistType } from "@/lib/availability/types";

export type SpecialistStatus = "onsite" | "remote" | "vacation" | "suspended";

export const ROLE_LABEL: Record<SpecialistType, string> = {
  therapist: "Therapist",
  analyst: "Analyst",
};

export const ROLE_BADGE: Record<SpecialistType, string> = {
  therapist: "bg-accent text-accent-foreground ring-1 ring-primary/20",
  analyst: "bg-warning-muted text-warning ring-1 ring-warning/30",
};

export interface Specialist {
  id: string;
  name: string;
  role: SpecialistType;
  email: string;
  status: SpecialistStatus;
  initials: string;
  config: RuleConfig;
  days: DayState[];
  daysOff: number[];
}

const emptyDays = (): DayState[] => Array.from({ length: 7 }, () => ({ blocks: [] }));

// Configured week: unavailable before 08:00 and after 20:00 → available 08:00–20:00.
function configuredWeek(): DayState[] {
  const d = emptyDays();
  for (let i = 0; i < 5; i++) {
    d[i] = {
      blocks: [
        { start: 0, end: 8, kind: "unavailable" as const },
        { start: 56, end: 72, kind: "unavailable" as const },
      ],
    };
  }
  return d;
}

function make(
  id: string,
  name: string,
  role: SpecialistType,
  email: string,
  status: SpecialistStatus,
  days: DayState[],
  daysOff: number[] = [5, 6],
): Specialist {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { id, name, role, email, status, initials, config: configFor(role), days, daysOff };
}

const SEED: Specialist[] = [
  make("sp-1", "Alex Rivera", "therapist", "alex.rivera@pulse.health", "onsite", configuredWeek()),
  make("sp-2", "Maya Chen", "therapist", "maya.chen@pulse.health", "remote", emptyDays()),
  make("sp-3", "Daniel Okoro", "therapist", "daniel.okoro@pulse.health", "onsite", emptyDays()),
  make("sp-4", "Priya Nair", "analyst", "priya.nair@pulse.health", "remote", emptyDays()),
  make("sp-5", "Tom Becker", "analyst", "tom.becker@pulse.health", "vacation", emptyDays()),
];

interface SpecialistStore {
  specialists: Specialist[];
  saveAvailability: (id: string, patch: Pick<Specialist, "config" | "days" | "daysOff">) => void;
}

export const useSpecialistStore = create<SpecialistStore>((set) => ({
  specialists: SEED,
  saveAvailability: (id, patch) =>
    set((state) => ({
      specialists: state.specialists.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),
}));
