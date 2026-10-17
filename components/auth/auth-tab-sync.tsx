"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AUTH_STORAGE_KEY, readStoredSession, sessionOwner, useAuthStore } from "@/lib/auth/store";

function reloadPage() {
  window.location.reload();
}

export function AuthTabSync({ reload = reloadPage }: { reload?: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORAGE_KEY) return;
      const current = useAuthStore.getState().session;
      const stored = readStoredSession(localStorage.getItem(AUTH_STORAGE_KEY));
      if (!stored) {
        if (!current) return;
        useAuthStore.getState().signOut();
        router.replace("/login");
        return;
      }
      void useAuthStore.persist.rehydrate();
      if (sessionOwner(stored) !== sessionOwner(current)) reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reload, router]);

  return null;
}
