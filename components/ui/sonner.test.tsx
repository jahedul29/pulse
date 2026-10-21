import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { Toaster } from "./sonner";

jest.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }));
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => (key === "close" ? "Close" : key) }));

it("gives every toast a labelled close button at the inline end that dismisses it", async () => {
  render(<Toaster />);
  act(() => {
    toast.error("Maximum 1 day off allowed");
  });
  const close = await screen.findByRole("button", { name: "Close" });
  const item = close.closest("[data-sonner-toast]");
  expect(item).toHaveClass("[--toast-close-button-end:0.5rem]", "rtl:[--toast-close-button-start:0.5rem]");
  await userEvent.click(close);
  await waitFor(() => expect(screen.queryByText("Maximum 1 day off allowed")).not.toBeInTheDocument());
});
