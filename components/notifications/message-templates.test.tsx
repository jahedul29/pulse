import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { MessageTemplates } from "./message-templates";
import { fetchTemplateDetail } from "../../lib/notifications/api";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], messages[ns]);
  return {
    useLocale: () => "en",
    useTranslations: (ns: string) => (key: string, vars?: Record<string, unknown>) => {
      const value = resolve(ns, key);
      let str = typeof value === "string" ? value : key;
      if (vars) {
        for (const [varName, varValue] of Object.entries(vars)) str = str.replace(`{${varName}}`, String(varValue));
      }
      return str;
    },
  };
});

jest.mock("../../lib/notifications/api", () => {
  const actual = jest.requireActual("../../lib/notifications/api");
  return { ...actual, fetchTemplateDetail: jest.fn() };
});

jest.mock("../ui/rich-text-editor", () => ({
  RichTextEditor: ({
    ariaLabel,
    value,
    onChange,
  }: {
    ariaLabel?: string;
    value: string;
    onChange: (v: string) => void;
  }) => <textarea aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} />,
}));

const detailMock = fetchTemplateDetail as jest.Mock;

describe("MessageTemplates", () => {
  afterEach(() => detailMock.mockReset());

  it("lists seeded templates and opens the side-by-side EN/AR editor", async () => {
    render(<MessageTemplates />);

    expect(await screen.findByText("AUTH_OTP")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "New template" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("English copy")).toBeInTheDocument();
    expect(screen.getByLabelText("Arabic copy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create template" })).toBeInTheDocument();
  });

  it("blocks create and shows required errors on empty submit", async () => {
    render(<MessageTemplates />);

    await userEvent.click(await screen.findByRole("button", { name: "New template" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create template" }));

    expect(await within(dialog).findByText("A message code is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("English copy is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("Arabic copy is required.")).toBeInTheDocument();
  });

  it("loads edit data from the API seam and populates the editor", async () => {
    detailMock.mockResolvedValue({
      code: "AUTH_OTP",
      category: "auth",
      en: "Your code is {code}.",
      ar: "رمزك هو {code}.",
      updatedAt: 1,
    });
    render(<MessageTemplates />);

    await userEvent.click(await screen.findByText("AUTH_OTP"));

    const dialog = await screen.findByRole("dialog");
    expect(detailMock).toHaveBeenCalledWith("AUTH_OTP");
    const en = within(dialog).getByLabelText("English copy") as HTMLTextAreaElement;
    await waitFor(() => expect(en.value).toContain("Your code is"));
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("shows an error + retry when the edit fetch fails", async () => {
    detailMock.mockRejectedValue(new Error("boom"));
    render(<MessageTemplates />);

    await userEvent.click(await screen.findByText("AUTH_OTP"));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Couldn't load this template. Try again.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("English copy")).not.toBeInTheDocument();
  });
});
