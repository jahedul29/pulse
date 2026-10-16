import { fireEvent, render, screen } from "@testing-library/react";
import mockMessages from "../../../../messages/en.json";
import { RegionNavigator, type NavigatorRegion } from "./region-navigator";

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

const regions: NavigatorRegion[] = [
  { id: 1, label: "Abu Dhabi", code: "AD-01", mapped: true, active: true },
  { id: 2, label: "Abu Dhabi – Al Ain (East)", code: null, mapped: true, active: true },
  { id: 3, label: "Abu Dhabi – Al Dhafra (West)", code: null, mapped: true, active: true },
  { id: 4, label: "Dubai", code: "DU-01", mapped: true, active: true },
  { id: 5, label: "Sharjah", code: "SH-01", mapped: true, active: true },
  { id: 6, label: "Al Qua'a", code: null, mapped: false, active: false },
];

function renderNavigator(overrides: Partial<Parameters<typeof RegionNavigator>[0]> = {}) {
  const props = {
    countryLabel: "United Arab Emirates",
    regions,
    currentRegionId: 4,
    onSelectRegion: jest.fn(),
    onCreateRegion: jest.fn(),
    canEdit: true,
    noPermissionLabel: "No permission",
    ...overrides,
  };
  render(<RegionNavigator {...props} />);
  return props;
}

describe("RegionNavigator", () => {
  it("shows the region count, marks the open region and flags unmapped or inactive ones", () => {
    renderNavigator();
    expect(screen.getByRole("heading", { name: "Regions in United Arab Emirates 6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dubai DU-01" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Al Qua'a Not mapped Inactive" })).toBeInTheDocument();
  });

  it("filters regions by name or code and says when nothing matches", () => {
    const props = renderNavigator();
    const search = screen.getByRole("searchbox", { name: "Search regions" });
    fireEvent.change(search, { target: { value: "dhafra" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "sh-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Sharjah SH-01" }));
    expect(props.onSelectRegion).toHaveBeenCalledWith(5);
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText('No regions match "zzz".')).toBeInTheDocument();
  });

  it("hides search for short lists and blocks New without permission", () => {
    const props = renderNavigator({ regions: regions.slice(0, 3), canEdit: false });
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    const create = screen.getByRole("button", { name: "New region" });
    expect(create).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(create);
    expect(props.onCreateRegion).not.toHaveBeenCalled();
  });
});
