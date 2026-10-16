import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { useAuthStore } from "@/lib/auth/store";
import { CountriesList } from "./countries-list";

const mockPush = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
let mockCitiesLoading = false;

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("../../lib/locations/queries", () => {
  const fixtures = jest.requireActual("./test-fixtures");
  return {
    useAllCountries: () => ({ data: fixtures.COUNTRIES, isPending: false, isError: false, isSuccess: true, refetch: jest.fn() }),
    useAllCities: () =>
      mockCitiesLoading
        ? { data: undefined, isPending: true, isError: false, isSuccess: false, refetch: jest.fn() }
        : { data: fixtures.CITIES, isPending: false, isError: false, isSuccess: true, refetch: jest.fn() },
    useCreateCountry: () => ({ mutateAsync: mockCreate, isPending: false }),
    useUpdateCountry: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteCountry: () => ({ mutateAsync: mockDelete, isPending: false }),
  };
});

jest.mock("next-intl", () => {
  const { translate } = jest.requireActual("./test-intl");
  return {
    useLocale: () => "en",
    useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) =>
      translate(mockMessages, `${namespace}.${key}`, values),
  };
});

function signIn(permissions: string[]) {
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Owner", role: "admin", token: "t", issuedAt: 0, permissions },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockCitiesLoading = false;
  signIn(["TECHNICAL.technical.VIEW", "TECHNICAL.technical.EDIT"]);
});

describe("CountriesList", () => {
  it("lists countries and opens a country's regions", async () => {
    render(<CountriesList />);
    const uae = screen.getByRole("link", { name: "View regions: United Arab Emirates" });
    expect(within(uae).getByText("2 regions")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: "View regions: Oman" })).getByText("No regions")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "View regions: China" }));
    expect(mockPush).toHaveBeenCalledWith("/admin/locations/regions?country=2");
  });

  it("blocks deleting a country that still has regions", async () => {
    render(<CountriesList />);
    const blocked = screen.getByRole("button", { name: "Delete: United Arab Emirates" });
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(blocked);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps delete off until it knows whether a country has regions", () => {
    mockCitiesLoading = true;
    render(<CountriesList />);
    expect(screen.getByRole("button", { name: "Delete: Oman" })).toHaveAttribute("aria-disabled", "true");
    expect(within(screen.getByRole("link", { name: "View regions: Oman" })).getByText("-")).toBeInTheDocument();
  });

  it("deletes an empty country after confirming", async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    render(<CountriesList />);
    await userEvent.click(screen.getByRole("button", { name: "Delete: Oman" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Oman will be removed. This can't be undone.")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete country" }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(3));
  });

  it("creates a country with an upper-cased code", async () => {
    mockCreate.mockResolvedValueOnce({ id: 9 });
    render(<CountriesList />);
    await userEvent.click(screen.getByRole("button", { name: "New country" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/^Code/), "sa");
    await userEvent.type(within(dialog).getByLabelText(/^Name \(English\)/), "Saudi Arabia");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create country" }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({ code: "SA", name: { en: "Saudi Arabia" }, is_active: true }),
    );
  });

  it("is read-only without the technical edit permission", () => {
    signIn(["TECHNICAL.technical.VIEW"]);
    render(<CountriesList />);
    expect(screen.getByRole("button", { name: "New country" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Edit details: Oman" })).toHaveAttribute("aria-disabled", "true");
  });
});
