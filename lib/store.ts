import { create } from "zustand";
import { clients as seed } from "@/lib/mock/data";
import type { Client } from "@/lib/types";

interface ClientStore {
  clients: Client[];
  addClient: (client: Client) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
}

export const useClientStore = create<ClientStore>((set) => ({
  clients: seed,
  addClient: (client) => set((state) => ({ clients: [client, ...state.clients] })),
  updateClient: (id, patch) =>
    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  deleteClient: (id) =>
    set((state) => ({ clients: state.clients.filter((c) => c.id !== id) })),
}));
