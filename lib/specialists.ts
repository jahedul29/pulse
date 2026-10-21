import type { AnnualSchedule, WeeklySchedule } from "@abapro-front-end/calendars";
import { emptyWeek } from "@abapro-front-end/calendars/weekly";
import { create } from "zustand";

export type SpecialistType = "therapist" | "analyst";

export interface Specialist {
  id: string;
  name: string;
  role: SpecialistType;
  email: string;
  initials: string;
  defined: boolean;
  weekly: WeeklySchedule;
  annualOff: AnnualSchedule;
}

function make(id: string, name: string, role: SpecialistType, email: string): Specialist {
  const initials = name
    .split(" ")
    .map((word) => word[0])
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
    weekly: emptyWeek(),
    annualOff: [],
  };
}

const SEED: Specialist[] = [
  make("sp-1", "Alex Rivera", "therapist", "alex.rivera@pulse.health"),
  make("sp-4", "Priya Nair", "analyst", "priya.nair@pulse.health"),
];

type WeeklyPatch = Partial<Pick<Specialist, "weekly" | "defined">>;

interface SpecialistStore {
  specialists: Specialist[];
  saveWeekly: (id: string, patch: WeeklyPatch) => void;
  saveAnnual: (id: string, annualOff: AnnualSchedule) => void;
}

export const useSpecialistStore = create<SpecialistStore>((set) => ({
  specialists: SEED,
  saveWeekly: (id, patch) =>
    set((state) => ({
      specialists: state.specialists.map((specialist) =>
        specialist.id === id ? { ...specialist, ...patch } : specialist,
      ),
    })),
  saveAnnual: (id, annualOff) =>
    set((state) => ({
      specialists: state.specialists.map((specialist) =>
        specialist.id === id ? { ...specialist, annualOff } : specialist,
      ),
    })),
}));
