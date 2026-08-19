import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authenticate, verifyMfa, REMEMBER_DAYS } from "./mock";
import type { AttemptOutcome, AuditEntry, LoginResult, Session } from "./types";

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

function deviceLabel() {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const os = /Mac/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : "Linux";
  const browser = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser";
  return `${browser} · ${os}`;
}

function writeSessionCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${7 * 86400}; samesite=lax`;
}

function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

interface AuthState {
  session: Session | null;
  audit: AuditEntry[];
  rememberedUntil: Record<string, number>;
  attempt: (email: string, password: string) => Promise<AttemptOutcome>;
  verify: (email: string, code: string, remember: boolean) => Promise<AttemptOutcome>;
  isRemembered: (email: string) => boolean;
  recordUnlock: (targetEmail: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const log = (email: string, result: LoginResult, stage: "password" | "mfa" | "admin") =>
        set((s) => ({
          audit: [
            {
              id: id(),
              email: email.trim().toLowerCase(),
              result,
              stage,
              at: Date.now(),
              ip: mockIp(),
              device: deviceLabel(),
            },
            ...s.audit,
          ].slice(0, 200),
        }));

      const establish = (o: AttemptOutcome) => {
        const token = id();
        const session: Session = {
          email: o.email,
          name: o.name ?? o.email,
          role: o.role ?? "Member",
          token,
          issuedAt: Date.now(),
        };
        writeSessionCookie(token);
        set({ session });
      };

      return {
        session: null,
        audit: [],
        rememberedUntil: {},

        isRemembered: (email) => {
          const until = get().rememberedUntil[email.trim().toLowerCase()];
          return typeof until === "number" && until > Date.now();
        },

        recordUnlock: (targetEmail) => log(targetEmail, "ACCOUNT_UNLOCKED", "admin"),

        attempt: async (email, password) => {
          const outcome = await authenticate(email, password, get().isRemembered(email));
          log(email, outcome.result, "password");
          if (outcome.result === "SUCCESS") establish(outcome);
          return outcome;
        },

        verify: async (email, code, remember) => {
          const outcome = await verifyMfa(email, code);
          log(email, outcome.result, "mfa");
          if (outcome.result === "SUCCESS") {
            if (remember) {
              set((s) => ({
                rememberedUntil: {
                  ...s.rememberedUntil,
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
      partialize: (s) => ({
        session: s.session,
        audit: s.audit,
        rememberedUntil: s.rememberedUntil,
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
