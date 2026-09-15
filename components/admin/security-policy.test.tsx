import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { SecurityPolicyEditor } from "./security-policy";

const policy = {
  id: 14,
  max_failed_attempts: 5,
  lockout_duration_minutes: 30,
  access_token_ttl_minutes: 60,
  refresh_token_ttl_days: 14,
  password_min_length: 12,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_number: true,
  password_require_symbol: true,
  password_max_age_days: 90,
  password_history_check_count: 5,
  mfa_required: false,
  sensitive_action_reauth_minutes: 15,
  fd: "2026-09-10T15:35:51.000000Z",
  td: "2099-01-01T00:00:00.000000Z",
  change_reason: "Baseline policy",
  created_by_admin_id: "a1",
  created_at: "2026-09-10T15:35:51.000000Z",
  created_by: { id: "a1", email: "admin@abapro.ai" },
};

const publishMock = jest.fn();

jest.mock("../../lib/security-policy/queries", () => ({
  useCurrentPolicy: () => ({ data: policy, isPending: false, isError: false, refetch: jest.fn() }),
  usePolicyVersions: () => ({ data: [policy], isPending: false, isError: false, refetch: jest.fn() }),
  usePublishPolicy: () => ({ mutateAsync: publishMock, isPending: false }),
}));

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], messages[ns]);
  return {
    useLocale: () => "en",
    useTranslations: (ns: string) => (key: string, vars?: Record<string, unknown>) => {
      const value = resolve(ns, key);
      let str = typeof value === "string" ? value : key;
      if (vars) for (const [name, val] of Object.entries(vars)) str = str.replace(`{${name}}`, String(val));
      return str;
    },
  };
});

describe("SecurityPolicyEditor", () => {
  afterEach(() => publishMock.mockReset());

  it("renders the BE fields and gates Save on dirty", async () => {
    render(<SecurityPolicyEditor />);

    const accessToken = screen.getByLabelText("Access token lifetime") as HTMLInputElement;
    expect(accessToken).toHaveValue(60);
    expect(screen.getByText("Require a lowercase letter")).toBeInTheDocument();

    const save = screen.getByRole("button", { name: "Save policy" });
    expect(save).toBeDisabled();

    await userEvent.clear(accessToken);
    await userEvent.type(accessToken, "90");
    expect(save).toBeEnabled();
  });
});
