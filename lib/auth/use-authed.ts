import { useAuthStore } from "./store";

export function useAuthed(): boolean {
  return useAuthStore((state) => Boolean(state.session?.accessToken ?? state.session?.token));
}
