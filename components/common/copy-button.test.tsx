import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import mockMessages from "../../messages/en.json";
import { CopyButton } from "./copy-button";

jest.mock("next-intl", () => {
  const { translate } = jest.requireActual("../locations/test-intl");
  return {
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
      translate(mockMessages, `${ns}.${key}`, values),
  };
});

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const writeText = jest.fn<Promise<void>, [string]>(async () => undefined);
Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

describe("CopyButton", () => {
  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
  });

  it("copies the value, says so, then goes back to its label", async () => {
    render(<CopyButton showLabel value={() => "https://example.test/x"} label="Copy link" copiedLabel="Link copied" />);

    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith("https://example.test/x");
    expect(await screen.findByRole("button", { name: "Link copied" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument(), { timeout: 3000 });
  });

  it("keeps its accessible name as an icon button", async () => {
    render(<CopyButton value="abc" label="Copy" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("abc");
    expect(await screen.findByText("Copied", { selector: "[aria-live]" })).toBeInTheDocument();
  });

  it("tells the admin when the browser refuses to copy", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    render(<CopyButton value="abc" label="Copy" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't copy. Select the text and copy it manually."));
  });
});
