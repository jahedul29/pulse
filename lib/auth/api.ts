import { apiData } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import { deviceFingerprint } from "./fingerprint";
import type { AuthToken, Platform } from "./types";

const PLATFORM: Platform = "WEB";

export interface LoginBody {
  email: string;
  password: string;
  remember?: boolean;
}

export async function login({ email, password, remember }: LoginBody): Promise<AuthToken> {
  return apiData<AuthToken>(`${ADMIN_IDENTITY}/login`, {
    method: "POST",
    auth: false,
    body: {
      email: email.trim(),
      password,
      fingerprint: deviceFingerprint(),
      platform: PLATFORM,
      remember: remember ?? false,
    },
  });
}
