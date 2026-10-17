import { create } from "zustand";
import { persist } from "zustand/middleware";
import { verifyMfa, REMEMBER_DAYS } from "./mock";
import { login } from "./api";
import { registerAuthBridge } from "@/lib/api/auth-bridge";
import { isApiError } from "@/lib/api/errors";
import { describeServerError } from "./server-error";
import type { AttemptOutcome, AuthenticatedAdmin, AuthToken, LoginResult, Session } from "./types";
import { writeLastActivity } from "./idle";

const SESSION_COOKIE = "abapro_session";
export const AUTH_STORAGE_KEY = "abapro-auth";
const DAY = 86_400_000;
const SESSION_TTL_MS = 7 * DAY;

function id() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `a-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function sessionOwner(session: Pick<Session, "adminId" | "email"> | null | undefined): string | null {
  return session ? (session.adminId ?? session.email) : null;
}

export function readStoredSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const session = (JSON.parse(raw) as { state?: { session?: Session | null } })?.state?.session;
    return session && typeof session === "object" ? session : null;
  } catch {
    return null;
  }
}

function storedSessionToken(): string | null | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const stored = readStoredSession(localStorage.getItem(AUTH_STORAGE_KEY));
    return stored ? (stored.accessToken ?? stored.token) : null;
  } catch {
    return undefined;
  }
}

function sameAdmin(session: Session, profile: AuthenticatedAdmin): boolean {
  if (session.adminId) return session.adminId === profile.id;
  return Boolean(profile.email) && session.email.trim().toLowerCase() === profile.email.trim().toLowerCase();
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
  rememberedUntil: Record<string, number>;
  attempt: (email: string, password: string, remember?: boolean) => Promise<AttemptOutcome>;
  verify: (email: string, code: string, remember: boolean) => Promise<AttemptOutcome>;
  isRemembered: (email: string) => boolean;
  syncProfile: (profile: AuthenticatedAdmin) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
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
        writeLastActivity(Date.now());
        set({ session });
      };

      const establishReal = (tok: AuthToken, remember: boolean) => {
        const session: Session = {
          email: tok.user.email,
          name: tok.user.full_name?.trim() || tok.user.email,
          role: tok.user.roles?.[0] ?? "Admin",
          token: tok.access_token,
          issuedAt: Date.now(),
          accessToken: tok.access_token,
          refreshToken: tok.refresh_token,
          expiresAt: Date.now() + (tok.expires_in ?? 0) * 1000,
          adminId: tok.user.id,
          permissions: Array.isArray(tok.user.permissions) ? tok.user.permissions : [],
          landingPage: tok.user.landing_page ?? null,
        };
        writeSessionCookie();
        writeLastActivity(Date.now());
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
        rememberedUntil: {},

        isRemembered: (email) => {
          const until = get().rememberedUntil[email.trim().toLowerCase()];
          return typeof until === "number" && until > Date.now();
        },

        attempt: async (email, password, remember = false) => {
          try {
            const tok = await login({ email, password, remember });
            establishReal(tok, remember);
            return {
              result: "SUCCESS",
              email: tok.user.email,
              name: tok.user.full_name?.trim() || tok.user.email,
              role: tok.user.roles?.[0],
            };
          } catch (error) {
            const result = mapLoginError(error);
            return result === "SERVER_ERROR" ? { result, email, serverError: describeServerError(error) } : { result, email };
          }
        },

        verify: async (email, code, remember) => {
          const outcome = await verifyMfa(email, code);
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

        syncProfile: (profile) => {
          const session = get().session;
          if (!session || !sameAdmin(session, profile)) return;
          const stored = storedSessionToken();
          if (stored !== undefined && stored !== (session.accessToken ?? session.token)) return;
          const next: Session = {
            ...session,
            name: profile.full_name?.trim() || session.name,
            role: profile.roles?.[0] ?? session.role,
            permissions: Array.isArray(profile.permissions) ? profile.permissions : session.permissions,
            landingPage: profile.landing_page ?? null,
          };
          const unchanged =
            next.name === session.name &&
            next.role === session.role &&
            next.landingPage === (session.landingPage ?? null) &&
            JSON.stringify(next.permissions ?? null) === JSON.stringify(session.permissions ?? null);
          if (!unchanged) set({ session: next });
        },

        signOut: () => {
          clearSessionCookie();
          set({ session: null });
        },
      };
    },
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        session: state.session,
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
