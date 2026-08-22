import { create } from "zustand";
import { SLOTS_PER_DAY } from "@/lib/availability/constants";
import { configFor } from "@/lib/availability/rules";
import type { DayState, RuleConfig, SpecialistType } from "@/lib/availability/types";

export interface Specialist {
  id: string;
  name: string;
  role: SpecialistType;
  email: string;
  initials: string;
  defined: boolean;
  config: RuleConfig;
  days: DayState[];
  daysOff: number[];
  annualOff: string[];
}

export function seedDays(daysOff: number[]): DayState[] {
  return Array.from({ length: 7 }, (_, i) =>
    daysOff.includes(i)
      ? { blocks: [{ start: 0, end: SLOTS_PER_DAY, kind: "unavailable" as const }] }
      : { blocks: [] },
  );
}

function make(id: string, name: string, role: SpecialistType, email: string): Specialist {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return {
    id,
    name,
    role,
    email,
    initials,
    defined: false,
    config: configFor(role),
    days: seedDays([]),
    daysOff: [],
    annualOff: [],
  };
}

const SEED: Specialist[] = [
  make("sp-1", "Alex Rivera", "therapist", "alex.rivera@pulse.health"),
  make("sp-4", "Priya Nair", "analyst", "priya.nair@pulse.health"),
];

interface SpecialistStore {
  specialists: Specialist[];
  saveAvailability: (
    id: string,
    patch: Pick<Specialist, "config" | "days" | "daysOff" | "defined">,
  ) => void;
  saveAnnual: (id: string, annualOff: string[]) => void;
}

export const useSpecialistStore = create<SpecialistStore>((set) => ({
  specialists: SEED,
  saveAvailability: (id, patch) =>
    set((state) => ({
      specialists: state.specialists.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),
  saveAnnual: (id, annualOff) =>
    set((state) => ({
      specialists: state.specialists.map((s) => (s.id === id ? { ...s, annualOff } : s)),
    })),
}));
