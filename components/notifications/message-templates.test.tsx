import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { MessageTemplates } from "./message-templates";

const template = {
  id: 1,
  code: "AUTH_OTP",
  name: "OTP message",
  channel_id: 1,
  subject: { EN: "Your code" },
  body: { EN: "<p>Your code is {code}.</p>" },
  is_active: true,
};

const createMock = jest.fn();

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
  useUpdateTemplate: () => ({ mutateAsync: jest.fn(), isPending: false }),
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
  };
});

describe("MessageTemplates", () => {
  afterEach(() => createMock.mockReset());

  it("lists templates and opens the EN/AR editor", async () => {
    render(<MessageTemplates />);

    expect(await screen.findByText("AUTH_OTP")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New template" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("English copy")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Arabic copy")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Subject (English)")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Create template" })).toBeInTheDocument();
  });

  it("opens a read-only detail drawer on row click", async () => {
    render(<MessageTemplates />);

    await userEvent.click(await screen.findByRole("link", { name: "AUTH_OTP" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("AUTH_OTP")).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Your code/).length).toBeGreaterThan(0);
    expect(within(dialog).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("blocks create and shows required errors on empty submit", async () => {
    render(<MessageTemplates />);

    await userEvent.click(await screen.findByRole("button", { name: "New template" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create template" }));

    expect(await within(dialog).findByText("A message code is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("An English subject is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("English copy is required.")).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });
});
