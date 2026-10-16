import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { useAuthStore } from "@/lib/auth/store";
import type { RegionEditorProps } from "./region-editor/region-editor";
import { RegionBuilder } from "./region-builder";
import { CITIES, cityFixture } from "./test-fixtures";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSave = jest.fn();
const mockDelete = jest.fn();
let mockSearch = "";
let mockCities = CITIES;
let mockCitiesRefetchFailed = false;
let lastEditorProps: RegionEditorProps | null = null;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@tanstack/react-query", () => ({ useQueries: () => [] }));

jest.mock("./region-editor/region-editor", () => ({
  RegionEditor: (props: RegionEditorProps) => {
    lastEditorProps = props;
    return (
      <div>
        <h2>{props.region.name}</h2>
        {props.conflict ? (
          <button type="button" onClick={props.onReload}>
            Reload region
          </button>
        ) : null}
      </div>
    );
  },
}));

jest.mock("../../lib/locations/queries", () => {
  const fixtures = jest.requireActual("./test-fixtures");
  const ready = (data: unknown) => ({ data, isPending: false, isError: false, isSuccess: true, refetch: jest.fn() });
  return {
    useAllCountries: () => ready(fixtures.COUNTRIES),
    useAllCities: () =>
      mockCitiesRefetchFailed
        ? { data: mockCities, isPending: false, isError: true, isRefetchError: true, isSuccess: false, refetch: jest.fn() }
        : ready(mockCities),
    coverageFileQueryOptions: (url: string | null) => ({ queryKey: ["coverage-file", url] }),
    useCoverageFile: (url: string | null) => (url ? ready({ version: 4, codes: ["39RZJ0001"] }) : ready(undefined)),
    useCreateCity: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useUpdateCity: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteCity: () => ({ mutateAsync: mockDelete, isPending: false }),
    useSaveCityCoverage: () => ({ mutateAsync: mockSave, isPending: false }),
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
  mockCities = CITIES;
  mockCitiesRefetchFailed = false;
  lastEditorProps = null;
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

describe("RegionBuilder", () => {
  it("opens the first mapped UAE region when no region is in the link", async () => {
    render(<RegionBuilder />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/admin/locations/builder?region=10"));
  });

  it("explains when the linked region doesn't exist", () => {
    mockSearch = "region=999";
    render(<RegionBuilder />);
    expect(screen.getByText("This region doesn't exist or was deleted.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the regions list" })).toHaveAttribute("href", "/admin/locations/regions");
  });

  it("lists the region's country in the switcher and saves cells with the region's status", async () => {
    mockSearch = "region=10";
    mockSave.mockResolvedValueOnce({ tiles_version: 5 });
    render(<RegionBuilder />);
    expect(screen.getByRole("heading", { name: "Abu Dhabi" })).toBeInTheDocument();
    expect(lastEditorProps?.picker.regions.map((region) => region.label)).toEqual(["Abu Dhabi", "Dubai"]);
    expect(lastEditorProps?.coverage).toMatchObject({ status: "ready", codes: ["39RZJ0001"] });

    let saved = false;
    await act(async () => {
      saved = (await lastEditorProps?.onSave({ codes: ["39QWG7153"], centre: [54.5, 24.5] })) ?? false;
    });
    expect(saved).toBe(true);
    expect(mockSave).toHaveBeenCalledWith({ id: 10, codes: ["39QWG7153"], centre: [54.5, 24.5] });
    expect(lastEditorProps?.conflict).toBe(false);
  });

  it("reports a failed save and keeps the changes", async () => {
    mockSearch = "region=10";
    mockSave.mockRejectedValueOnce(new Error("boom"));
    render(<RegionBuilder />);
    let saved = true;
    await act(async () => {
      saved = (await lastEditorProps?.onSave({ codes: ["39QWG7153"], centre: [54.5, 24.5] })) ?? true;
    });
    expect(saved).toBe(false);
  });

  it("moves to the next region in the country after deleting", async () => {
    mockSearch = "region=10";
    mockDelete.mockResolvedValueOnce(undefined);
    render(<RegionBuilder />);
    await act(async () => {
      await lastEditorProps?.onDeleteRegion();
    });
    expect(mockDelete).toHaveBeenCalledWith(10);
    expect(mockReplace).toHaveBeenCalledWith("/admin/locations/builder?region=11");
  });

  it("warns when someone else saves the open region", async () => {
    mockSearch = "region=10";
    const { rerender } = render(<RegionBuilder />);
    expect(screen.queryByRole("button", { name: "Reload region" })).not.toBeInTheDocument();
    mockCities = CITIES.map((city) => (city.id === 10 ? cityFixture({ ...city, tiles_version: 9 }) : city));
    rerender(<RegionBuilder />);
    expect(lastEditorProps?.conflict).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Reload region" }));
    expect(lastEditorProps?.conflict).toBe(false);
  });

  it("keeps the editor open when a background reload of the regions fails", () => {
    mockSearch = "region=10";
    mockCitiesRefetchFailed = true;
    render(<RegionBuilder />);
    expect(screen.getByRole("heading", { name: "Abu Dhabi" })).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load regions.")).not.toBeInTheDocument();
    expect(jest.requireMock("sonner").toast.error).toHaveBeenCalledWith("Couldn't load regions.");
  });
});
