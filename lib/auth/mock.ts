import type { AttemptOutcome, MockAccount } from "./types";

export const MFA_CODE = "123456";
export const LOCKOUT_MINUTES = 1;
export const REMEMBER_DAYS = 30;

const MINUTE = 60_000;

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: "admin@abapro.health",
    password: "abapro",
    status: "active",
    mfaEnabled: true,
    name: "Dana Okonkwo",
    role: "Administrator",
  },
  {
    email: "owner@abapro.health",
    password: "abapro",
    status: "active",
    mfaEnabled: false,
    name: "Sam Al-Rashid",
    role: "Owner",
  },
  {
    email: "locked@abapro.health",
    password: "abapro",
    status: "locked",
    mfaEnabled: false,
    lockedUntilOffsetMs: LOCKOUT_MINUTES * MINUTE,
    name: "Locked Account",
    role: "Analyst",
  },
  {
    email: "pending@abapro.health",
    password: "abapro",
    status: "pending",
    mfaEnabled: false,
    name: "Pending Account",
    role: "Analyst",
  },
  {
    email: "suspended@abapro.health",
    password: "abapro",
    status: "suspended",
    mfaEnabled: false,
    name: "Suspended Account",
    role: "Analyst",
  },
  {
    email: "deactivated@abapro.health",
    password: "abapro",
    status: "deactivated",
    mfaEnabled: false,
    name: "Deactivated Account",
    role: "Analyst",
  },
];

const SERVER_ERROR_EMAIL = "error@abapro.health";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function findAccount(email: string) {
  const target = email.trim().toLowerCase();
  return MOCK_ACCOUNTS.find((account) => account.email === target);
}

export async function authenticate(
  email: string,
  password: string,
  deviceRemembered: boolean,
): Promise<AttemptOutcome> {
  await wait(700);

  if (email.trim().toLowerCase() === SERVER_ERROR_EMAIL) {
    return { result: "SERVER_ERROR", email };
  }

  const account = findAccount(email);
  if (!account || account.password !== password) {
    return { result: "INVALID_CREDENTIALS", email };
  }

  const base = { email: account.email, name: account.name, role: account.role };

  switch (account.status) {
    case "locked":
      return {
        result: "ACCOUNT_LOCKED",
        lockedUntil: Date.now() + (account.lockedUntilOffsetMs ?? LOCKOUT_MINUTES * MINUTE),
        ...base,
      };
    case "pending":
      return { result: "ACCOUNT_PENDING", ...base };
    case "suspended":
      return { result: "ACCOUNT_SUSPENDED", ...base };
    case "deactivated":
      return { result: "ACCOUNT_DEACTIVATED", ...base };
    case "active":
      if (account.mfaEnabled && !deviceRemembered) {
        return { result: "MFA_REQUIRED", ...base };
      }
      return { result: "SUCCESS", ...base };
  }
}

export async function verifyMfa(email: string, code: string): Promise<AttemptOutcome> {
  await wait(500);
  const account = findAccount(email);
  if (!account) return { result: "INVALID_CREDENTIALS", email };
  if (code !== MFA_CODE) return { result: "INVALID_CREDENTIALS", email };
  return { result: "SUCCESS", email: account.email, name: account.name, role: account.role };
}
