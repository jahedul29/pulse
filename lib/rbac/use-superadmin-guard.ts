"use client";

import { useCallback } from "react";
import { useAllAdminUsers } from "@/lib/user-management/queries";
import { useNow } from "@/lib/use-now";
import { isLastActiveSuperadmin } from "./superadmin";

export type SuperadminCheck = "checking" | "unverified" | "last" | null;

export function useSuperadminGuard(enabled = true) {
  const query = useAllAdminUsers(enabled);
  const now = useNow(60_000, enabled);
  const { data, isError } = query;
  const check = useCallback(
    (userId: string): SuperadminCheck => {
      if (isError) return "unverified";
      if (!data) return "checking";
      return isLastActiveSuperadmin(userId, data, now) ? "last" : null;
    },
    [data, isError, now],
  );
  return { check, users: data, now };
}
