export interface StaffRecord {
  id: string;
  name: string;
  email: string;
  initials: string;
  title: string;
  department: string;
  terminated: boolean;
}

export interface StaffQuery {
  search?: string;
}
