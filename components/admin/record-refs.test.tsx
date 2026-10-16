import { render, screen } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth/store";
import { RecordName, ReferenceValue } from "./record-refs";

const mockCitiesOptions = jest.fn();
const mockCountriesOptions = jest.fn();

jest.mock("next-intl", () => ({ useLocale: () => "en" }));

jest.mock("../../lib/locations/queries", () => ({
  useAllCities: (options: { enabled?: boolean }) => {
    mockCitiesOptions(options);
    return { data: options.enabled ? [{ id: 7, name: "Dubai", name_translations: { en: "Dubai", ar: "دبي" } }] : undefined };
  },
  useAllCountries: (options: { enabled?: boolean }) => {
    mockCountriesOptions(options);
    return { data: options.enabled ? [{ id: 1, name: "United Arab Emirates", name_translations: { en: "United Arab Emirates" } }] : undefined };
  },
}));

const fallbacks = { admin: "Admin account", template: "Message template", alertRoute: "Alert route", region: "Region", country: "Country" };

function signIn(permissions: string[]) {
  useAuthStore.setState({
    session: { email: "auditor@abapro.health", name: "Auditor", role: "admin", token: "t", issuedAt: 0, permissions },
  });
}

beforeEach(() => {
  mockCitiesOptions.mockClear();
  mockCountriesOptions.mockClear();
});

describe("location references", () => {
  it("links region and country ids to their screens by name", () => {
    signIn(["TECHNICAL.technical.VIEW"]);
    render(
      <>
        <ReferenceValue fieldKey="city_id" value="7" locale="en" fallbacks={fallbacks} />
        <ReferenceValue fieldKey="country_id" value="1" locale="en" fallbacks={fallbacks} />
      </>,
    );
    expect(screen.getByRole("link", { name: "Dubai" })).toHaveAttribute("href", "/admin/locations/builder?region=7");
    expect(screen.getByRole("link", { name: "United Arab Emirates" })).toHaveAttribute("href", "/admin/locations/regions?country=1");
  });

  it("names an action-log target region", () => {
    signIn(["TECHNICAL.technical.VIEW"]);
    render(<RecordName kind="region" id="7" fallback="Region" />);
    expect(screen.getByText("Dubai")).toBeInTheDocument();
  });

  it("doesn't load location names without the technical view permission", () => {
    signIn([]);
    render(<ReferenceValue fieldKey="city_id" value="7" locale="en" fallbacks={fallbacks} />);
    expect(screen.getByRole("link", { name: "Region" })).toBeInTheDocument();
    expect(mockCitiesOptions).toHaveBeenCalledWith({ enabled: false });
  });
});
