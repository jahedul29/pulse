import { create } from "zustand";
import { persist } from "zustand/middleware";
import { verifyMfa, REMEMBER_DAYS } from "./mock";
import { login } from "./api";
import { currentDeviceLabel } from "@/lib/device";
import { registerAuthBridge } from "@/lib/api/auth-bridge";
import { isApiError } from "@/lib/api/errors";
import type { AttemptOutcome, AuditEntry, AuthToken, LoginResult, Session } from "./types";

const SESSION_COOKIE = "abapro_session";
const DAY = 86_400_000;
const SESSION_TTL_MS = 7 * DAY;

function id() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `a-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function mockIp() {
  return `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
}

function writeSessionCookie() {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${7 * 86400}; samesite=lax${secure}`;
}

function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

interface AuthState {
  session: Session | null;
  audit: AuditEntry[];
  rememberedUntil: Record<string, number>;
  attempt: (email: string, password: string, remember?: boolean) => Promise<AttemptOutcome>;
  verify: (email: string, code: string, remember: boolean) => Promise<AttemptOutcome>;
  isRemembered: (email: string) => boolean;
  recordUnlock: (targetEmail: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const log = (email: string, result: LoginResult, stage: "password" | "mfa" | "admin") =>
        set((state) => ({
          audit: [
            {
              id: id(),
              email: email.trim().toLowerCase(),
              result,
              stage,
              at: Date.now(),
              ip: mockIp(),
              device: currentDeviceLabel(),
            },
            ...state.audit,
          ].slice(0, 200),
        }));

      const establish = (outcome: AttemptOutcome) => {
        const token = id();
        const session: Session = {
          email: outcome.email,
          name: outcome.name ?? outcome.email,
          role: outcome.role ?? "Member",
          token,
          issuedAt: Date.now(),
        };
        writeSessionCookie();
        set({ session });
      };

      const establishReal = (tok: AuthToken, remember: boolean) => {
        const session: Session = {
          email: tok.user.email,
          name: tok.user.email,
          role: tok.user.roles?.[0] ?? "Admin",
          token: tok.access_token,
          issuedAt: Date.now(),
          accessToken: tok.access_token,
          refreshToken: tok.refresh_token,
          expiresAt: Date.now() + (tok.expires_in ?? 0) * 1000,
          adminId: tok.user.id,
        };
        writeSessionCookie();
        set({ session });
        if (remember) {
          set((state) => ({
            rememberedUntil: {
              ...state.rememberedUntil,
              [tok.user.email.trim().toLowerCase()]: Date.now() + REMEMBER_DAYS * DAY,
            },
          }));
        }
      };

      const mapLoginError = (error: unknown): LoginResult => {
        if (isApiError(error)) {
          if (error.status === 423) return "ACCOUNT_LOCKED";
          if (error.status === 422 || error.status === 401) return "INVALID_CREDENTIALS";
        }
        return "SERVER_ERROR";
      };

      let refreshInFlight: Promise<boolean> | null = null;
      const runRefresh = async (): Promise<boolean> => {
        return false;
      };
      const refresh = () => {
        if (!refreshInFlight) {
          refreshInFlight = runRefresh().finally(() => {
            refreshInFlight = null;
          });
        }
        return refreshInFlight;
      };

      registerAuthBridge({
        getAccessToken: () => {
          const session = get().session;
          return session?.accessToken ?? session?.token ?? null;
        },
        refresh,
        onAuthLost: () => {
          get().signOut();
          if (typeof window !== "undefined") window.location.assign("/login");
        },
      });

      return {
        session: null,
        audit: [],
        rememberedUntil: {},

        isRemembered: (email) => {
          const until = get().rememberedUntil[email.trim().toLowerCase()];
          return typeof until === "number" && until > Date.now();
        },

        recordUnlock: (targetEmail) => log(targetEmail, "ACCOUNT_UNLOCKED", "admin"),

        attempt: async (email, password, remember = false) => {
          try {
            const tok = await login({ email, password, remember });
            log(email, "SUCCESS", "password");
            establishReal(tok, remember);
            return { result: "SUCCESS", email: tok.user.email, name: tok.user.email, role: tok.user.roles?.[0] };
          } catch (error) {
            const result = mapLoginError(error);
            log(email, result, "password");
            return { result, email };
          }
        },

        verify: async (email, code, remember) => {
          const outcome = await verifyMfa(email, code);
          log(email, outcome.result, "mfa");
          if (outcome.result === "SUCCESS") {
            if (remember) {
              set((state) => ({
                rememberedUntil: {
                  ...state.rememberedUntil,
                  [email.trim().toLowerCase()]: Date.now() + REMEMBER_DAYS * DAY,
                },
              }));
            }
            establish(outcome);
          }
          return outcome;
        },

        signOut: () => {
          clearSessionCookie();
          set({ session: null });
        },
      };
    },
    {
      name: "abapro-auth",
      partialize: (state) => ({
        session: state.session,
        audit: state.audit,
        rememberedUntil: state.rememberedUntil,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.session && Date.now() - state.session.issuedAt > SESSION_TTL_MS) {
          clearSessionCookie();
          state.session = null;
        }
      },
    },
  ),
);
