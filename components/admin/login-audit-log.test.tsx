import { render, screen } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import type { LoginAuditEntry } from "@/lib/audit/types";
import { LoginAuditLog } from "./login-audit-log";

const mockEntries: LoginAuditEntry[] = [
  {
    id: "1",
    createdAt: Date.parse("2026-10-27T08:45:00Z"),
    attemptedIdentifier: "admin@ababro.ai",
    adminAccountId: "u-1",
    adminName: "System Admin",
    result: "SUCCESS",
    method: "PASSWORD_MFA",
    ip: "",
    device: "",
  },
  {
    id: "2",
    createdAt: Date.parse("2026-10-27T08:44:00Z"),
    attemptedIdentifier: "amdin@ababro.ai",
    adminAccountId: null,
    adminName: null,
    result: "INVALID_CREDENTIALS",
    method: "PASSWORD_MFA",
    ip: "",
    device: "",
  },
];

jest.mock("../../lib/audit/queries", () => ({
  useLoginAudit: () => ({
    data: { data: mockEntries, meta: { total: mockEntries.length } },
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  }),
}));

jest.mock("../../lib/audit/audit-api", () => ({
  exportLoginAuditCsv: jest.fn(async () => ""),
}));

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((accumulator, part) => (accumulator as Record<string, unknown>)?.[part], messages[ns]);
  return {
    useLocale: () => "en",
    useTranslations: (ns: string) => {
      const translate = (key: string, vars?: Record<string, unknown>) => {
        const value = resolve(ns, key);
        let str = typeof value === "string" ? value : key;
        if (vars) for (const [varName, varValue] of Object.entries(vars)) str = str.replace(`{${varName}}`, String(varValue));
        return str;
      };
      translate.has = (key: string) => typeof resolve(ns, key) === "string";
      return translate;
    },
  };
});

describe("LoginAuditLog", () => {
  it("shows the attempted identifier as typed, also when it matched no account", () => {
    render(<LoginAuditLog />);

    expect(screen.getByText("admin@ababro.ai")).toBeInTheDocument();
    expect(screen.getByText("amdin@ababro.ai")).toBeInTheDocument();
    expect(screen.getByText("Unknown / unmatched")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*\*/)).not.toBeInTheDocument();
  });
});
