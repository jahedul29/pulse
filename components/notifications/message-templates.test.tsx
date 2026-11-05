import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { MessageTemplates } from "./message-templates";
import { useAuthStore } from "@/lib/auth/store";

const template = {
  id: 1,
  code: "AUTH_OTP",
  name: "OTP message",
  type: "NOTIFICATION",
  channel_id: 1,
  icon: "user_check",
  sender_name: "ABAPRO",
  header_title: { EN: "Your code is ready" },
  header_subtitle: null,
  subject: { EN: "Your code" },
  body: { EN: '<p>Hello {first_name}, <span class="highlight">your code</span> is ready.</p>' },
  button_label: { EN: "OK" },
  is_active: true,
};

const createMock = jest.fn();
const updateMock = jest.fn();

let mockSearch = new URLSearchParams();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearch,
}));

beforeEach(() => {
  mockSearch = new URLSearchParams();
  mockReplace.mockReset();
});

jest.mock("../../lib/notifications/queries", () => ({
  useAllTemplates: () => ({ data: [template], isPending: false, isError: false, refetch: jest.fn() }),
  useTemplate: () => ({ data: template, isPending: false, isError: false, refetch: jest.fn() }),
  useChannels: () => ({ data: [{ id: 1, code: "IN_APP", name: "In-app inbox", is_active: true }] }),
  useChannelSearch: () => ({
    data: { pages: [{ data: [{ id: 1, code: "IN_APP", name: "In-app inbox", is_active: true }], meta: { current_page: 1, last_page: 1 } }] },
    isPending: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useCreateTemplate: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateTemplate: () => ({ mutateAsync: updateMock, isPending: false }),
  useDeleteTemplate: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("../ui/rich-text-editor", () => ({
  RichTextEditor: ({
    ariaLabel,
    value,
    onChange,
  }: {
    ariaLabel?: string;
    value: string;
    onChange: (next: string) => void;
  }) => <textarea aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} />,
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
    createTranslator:
      ({ messages: bundle, namespace }: { messages: Record<string, unknown>; namespace: string }) =>
      (key: string) => {
        const value = `${namespace}.${key}`
          .split(".")
          .reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], bundle);
        return typeof value === "string" ? value : key;
      },
  };
});


beforeEach(() => {
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Owner", role: "superadmin", token: "t", issuedAt: 0 },
  });
});

describe("MessageTemplates", () => {
  afterEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
  });

  it("lists templates with their type and opens the EN/AR editor", async () => {
    render(<MessageTemplates />);

    const row = await screen.findByRole("link", { name: "AUTH_OTP" });
    expect(within(row).getByText("Notification")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New template" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("English copy")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Arabic copy")).toBeInTheDocument();
    expect(within(dialog).getByText("Bar title (English)").closest("label")).toHaveTextContent("required");
    expect(within(dialog).getByText("Subject (English)").closest("label")).not.toHaveTextContent("required");
    expect(within(dialog).getByLabelText(/^Sender name/)).toHaveValue("ABAPRO");
    expect(within(dialog).getByLabelText(/^Button label \(English\)/)).toHaveValue("OK");
    expect(within(dialog).getByLabelText(/^Button label \(Arabic\)/)).toHaveValue("حسناً");
    expect(within(dialog).getByRole("button", { name: "Create template" })).toBeInTheDocument();
  });

  it("shows only the message and button fields for a popup", async () => {
    render(<MessageTemplates />);

    await userEvent.click(await screen.findByRole("button", { name: "New template" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("combobox", { name: /^Type/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Popup" }));

    expect(within(dialog).queryByLabelText(/^Bar title \(English\)/)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/^Subject \(English\)/)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/^Sender name/)).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("English copy")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Button label \(English\)/)).toBeInTheDocument();
  });

  it("opens a read-only detail drawer with the app preview on row click", async () => {
    render(<MessageTemplates />);

    await userEvent.click(await screen.findByRole("link", { name: "AUTH_OTP" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("AUTH_OTP")).toBeInTheDocument();
    expect(within(dialog).getByText("Checked user")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Notification bar").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Your code is ready")).toBeInTheDocument();
    expect(dialog.querySelector("span.highlight")).toHaveTextContent("your code");
    expect(within(dialog).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("blocks create and shows required errors on empty submit", async () => {
    render(<MessageTemplates />);

    await userEvent.click(await screen.findByRole("button", { name: "New template" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create template" }));

    expect(await within(dialog).findByText("A message code is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("An English bar title is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("English copy is required.")).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a notification with the new fields and no subject", async () => {
    createMock.mockResolvedValueOnce({});
    render(<MessageTemplates />);

    await userEvent.click(await screen.findByRole("button", { name: "New template" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/^Message code/), "ACCOUNT_NOTICE");
    await userEvent.type(within(dialog).getByLabelText(/^Name/), "Account notice");
    await userEvent.type(within(dialog).getByLabelText(/^Bar title \(English\)/), "Account status change");
    await userEvent.type(within(dialog).getByLabelText("English copy"), "<p>Hello</p>");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create template" }));

    expect(createMock).toHaveBeenCalledWith({
      code: "ACCOUNT_NOTICE",
      name: "Account notice",
      type: "NOTIFICATION",
      channel_id: 1,
      icon: null,
      sender_name: "ABAPRO",
      header_title: { EN: "Account status change" },
      header_subtitle: null,
      subject: null,
      body: { EN: "<p>Hello</p>" },
      button_label: { EN: "OK", AR: "حسناً" },
      is_active: true,
    });
  });

  it("keeps Save off until something changes, then sends the edited template", async () => {
    updateMock.mockResolvedValueOnce({});
    render(<MessageTemplates />);

    const row = await screen.findByRole("link", { name: "AUTH_OTP" });
    await userEvent.click(within(row).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    const save = within(dialog).getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText(/^Bar subtitle \(English\)/), "Use it within 5 minutes");
    expect(save).toBeEnabled();
    await userEvent.click(save);

    expect(updateMock).toHaveBeenCalledWith({
      id: 1,
      body: expect.objectContaining({
        type: "NOTIFICATION",
        icon: "user_check",
        sender_name: "ABAPRO",
        header_title: { EN: "Your code is ready" },
        header_subtitle: { EN: "Use it within 5 minutes" },
        subject: { EN: "Your code" },
        body: { EN: '<p>Hello {first_name}, <span class="highlight">your code</span> is ready.</p>' },
        button_label: { EN: "OK" },
      }),
    });
  });

  it("sends null for every header field when an edited template becomes a popup", async () => {
    updateMock.mockResolvedValueOnce({});
    render(<MessageTemplates />);

    const row = await screen.findByRole("link", { name: "AUTH_OTP" });
    await userEvent.click(within(row).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("combobox", { name: /^Type/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Popup" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(updateMock).toHaveBeenCalledWith({
      id: 1,
      body: expect.objectContaining({
        type: "POPUP",
        icon: null,
        sender_name: null,
        header_title: null,
        header_subtitle: null,
        subject: null,
        button_label: { EN: "OK" },
      }),
    });
  });

  it("opens the template drawer from an ?open= deep link and clears it on close", async () => {
    mockSearch = new URLSearchParams("open=1");
    render(<MessageTemplates />);

    const dialog = await screen.findByRole("dialog", { name: "OTP message" });
    expect(within(dialog).getByText("AUTH_OTP")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(mockReplace).toHaveBeenCalledWith("/admin/notifications/templates");
  });
});
