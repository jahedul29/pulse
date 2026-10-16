import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { useAuthStore } from "@/lib/auth/store";
import { RegionsList } from "./regions-list";

const mockPush = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("../../lib/locations/queries", () => {
  const fixtures = jest.requireActual("./test-fixtures");
  return {
    useAllCountries: () => ({ data: fixtures.COUNTRIES, isPending: false, isError: false, isSuccess: true, refetch: jest.fn() }),
    useAllCities: () => ({ data: fixtures.CITIES, isPending: false, isError: false, isSuccess: true, refetch: jest.fn() }),
    useCreateCity: () => ({ mutateAsync: mockCreate, isPending: false }),
    useUpdateCity: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteCity: () => ({ mutateAsync: mockDelete, isPending: false }),
  };
});

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, unknown>;
  const resolve = (path: string): unknown =>
    path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
  return {
    useLocale: () => "en",
    useTranslations: (namespace: string) => (key: string, values: Record<string, unknown> = {}) => {
      const value = resolve(`${namespace}.${key}`);
      let text = typeof value === "string" ? value : key;
      for (const [name, replacement] of Object.entries(values)) text = text.split(`{${name}}`).join(String(replacement));
      return text;
    },
  };
});

beforeEach(() => {
  jest.resetAllMocks();
  mockSearch = "";
  useAuthStore.setState({
    session: {
      email: "owner@abapro.health",
      name: "Owner",
      role: "admin",
      token: "t",
      issuedAt: 0,
      permissions: ["TECHNICAL.technical.VIEW", "TECHNICAL.technical.EDIT"],
    },
  });
});

const openLabel = (name: string) => `Open in the region builder: ${name}`;

describe("RegionsList", () => {
  it("lists every region and opens one in the region builder", async () => {
    render(<RegionsList />);
    expect(screen.getByRole("link", { name: openLabel("Beijing") })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: openLabel("Abu Dhabi") }));
    expect(mockPush).toHaveBeenCalledWith("/admin/locations/builder?region=10");
  });

  it("shows only the country from the link", () => {
    mockSearch = "country=2";
    render(<RegionsList />);
    expect(screen.getByRole("link", { name: openLabel("Beijing") })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: openLabel("Abu Dhabi") })).not.toBeInTheDocument();
  });

  it("creates a region in the linked country and opens it", async () => {
    mockSearch = "country=1";
    mockCreate.mockResolvedValueOnce({ id: 44 });
    render(<RegionsList />);
    await userEvent.click(screen.getByRole("button", { name: "New region" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/^Name \(English\)/), "Al Ain");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create region" }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ country_id: 1, name: { en: "Al Ain" }, is_active: true }));
    expect(mockPush).toHaveBeenCalledWith("/admin/locations/builder?region=44");
  });

  it("deletes a region after confirming", async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    render(<RegionsList />);
    await userEvent.click(screen.getByRole("button", { name: "Delete: Dubai" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete region" }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(11));
  });
});
