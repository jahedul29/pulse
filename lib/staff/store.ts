import { create } from "zustand";
import { seedStaff } from "./mock";
import type { StaffRecord } from "./types";

interface StaffState {
  staff: StaffRecord[];
}

export const useStaffStore = create<StaffState>(() => ({
  staff: seedStaff(),
}));
