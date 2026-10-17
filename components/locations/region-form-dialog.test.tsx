import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { EMPTY_REGION_FORM } from "@/lib/locations/forms";
import { RegionFormDialog } from "./region-form-dialog";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, unknown>;
  const resolve = (path: string): unknown =>
    path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
  return {
    useLocale: () => "en",
    useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
      const value = resolve(`${namespace}.${key}`);
      let text = typeof value === "string" ? value : key;
      for (const [name, replacement] of Object.entries(values ?? {})) text = text.replace(`{${name}}`, String(replacement));
      return text;
    },
  };
});

const countries = [
  { id: 1, label: "United Arab Emirates" },
  { id: 2, label: "China" },
];

describe("RegionFormDialog", () => {
  it("marks country and English name as required and reports both when empty", async () => {
    const onSubmit = jest.fn();
    render(
      <RegionFormDialog open onOpenChange={jest.fn()} mode="create" initialValues={EMPTY_REGION_FORM} countryOptions={countries} submitting={false} onSubmit={onSubmit} />,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("New region")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create region" }));
    expect(await within(dialog).findByText("Choose a country.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter the English name.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the trimmed values for a new region", async () => {
    const onSubmit = jest.fn();
    render(
      <RegionFormDialog
        open
        onOpenChange={jest.fn()}
        mode="create"
        initialValues={{ ...EMPTY_REGION_FORM, countryId: "1" }}
        countryOptions={countries}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getByLabelText(/^Name \(English\)/), "  Al Ain  ");
    await userEvent.type(screen.getByLabelText("Name (Arabic)"), "العين");
    await userEvent.type(screen.getByLabelText("Code"), "AD-02");
    fireEvent.click(screen.getByRole("button", { name: "Create region" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ countryId: "1", code: "AD-02", nameEn: "Al Ain", nameAr: "العين", isActive: true }),
    );
  });

  it("keeps Save disabled while editing until something changes", async () => {
    render(
      <RegionFormDialog
        open
        onOpenChange={jest.fn()}
        mode="edit"
        initialValues={{ countryId: "1", code: "DU-01", nameEn: "Dubai", nameAr: "", isActive: true }}
        countryOptions={countries}
        submitting={false}
        onSubmit={jest.fn()}
      />,
    );
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Name (Arabic)"), "دبي");
    expect(save).toBeEnabled();
  });

  it("won't let a saved Arabic name be emptied", async () => {
    const onSubmit = jest.fn();
    render(
      <RegionFormDialog
        open
        onOpenChange={jest.fn()}
        mode="edit"
        initialValues={{ countryId: "1", code: "", nameEn: "Dubai", nameAr: "دبي", isActive: true }}
        countryOptions={countries}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText("Once saved, the Arabic name can be changed but not removed.")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/^Name \(Arabic\)/));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Enter the Arabic name. Once saved, it can be changed but not removed.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
