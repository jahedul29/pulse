import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { saveCityCoverage } from "./locations-api";
import { useDeleteCity, useSaveCityCoverage } from "./queries";
import type { CityDto } from "./types";

jest.mock("./locations-api", () => ({
  saveCityCoverage: jest.fn(),
  deleteCity: jest.fn(async () => undefined),
  listAllCities: jest.fn(),
  listAllCountries: jest.fn(),
}));

const mockSave = saveCityCoverage as jest.MockedFunction<typeof saveCityCoverage>;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

const city: CityDto = {
  id: 3,
  country_id: 1,
  code: "DU-01",
  name: "Dubai",
  sort_order: 1,
  is_active: true,
  center: null,
  tiles_url: "https://abapro.s3.eu-north-1.amazonaws.com/env/Media/coverage/cities/DU-01/tiles.v1.json",
  tiles_version: 1,
  created_at: null,
  updated_at: null,
};

describe("useSaveCityCoverage", () => {
  it("sends 1 m points but caches the saved file as cell codes", async () => {
    const newUrl = "https://abapro.s3.eu-north-1.amazonaws.com/env/Media/coverage/cities/DU-01/tiles.v2.json";
    mockSave.mockResolvedValueOnce({ city_id: 3, tiles_count: 2, points_received: 2, is_active: true, tiles_url: newUrl, tiles_version: 2 });
    const { client, wrapper } = setup();
    client.setQueryData(queryKeys.cities(), [city]);
    const { result } = renderHook(() => useSaveCityCoverage(), { wrapper });

    await act(() => result.current.mutateAsync({ id: 3, codes: ["39QWG7153", "39QWG7154"], centre: [54.5, 24.5] }));

    expect(mockSave).toHaveBeenCalledWith(3, {
      center: { lat: 24.5, lng: 54.5 },
      points: [{ mgrs: "39Q WG 71500 53500" }, { mgrs: "39Q WG 71500 54500" }],
    });
    expect(client.getQueryData(queryKeys.coverageFile(newUrl))).toEqual({ version: 2, codes: ["39QWG7153", "39QWG7154"] });
    expect(client.getQueryData<CityDto[]>(queryKeys.cities())?.[0]).toMatchObject({
      tiles_url: newUrl,
      tiles_version: 2,
      center: { lat: 24.5, lng: 54.5 },
    });
  });
});

describe("useDeleteCity", () => {
  it("resolves without waiting for the region list to reload", async () => {
    const { client, wrapper } = setup();
    let finishRefetch: () => void = () => undefined;
    let fetches = 0;
    const loadCities = (): Promise<CityDto[]> => {
      fetches += 1;
      if (fetches === 1) return Promise.resolve([city]);
      return new Promise<CityDto[]>((resolve) => (finishRefetch = () => resolve([])));
    };
    const { result } = renderHook(
      () => ({ remove: useDeleteCity(), cities: useQuery({ queryKey: queryKeys.cities(), queryFn: loadCities }) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.cities.data).toEqual([city]));
    await act(() => result.current.remove.mutateAsync(3));
    expect(fetches).toBe(2);
    expect(client.getQueryData(queryKeys.cities())).toEqual([]);
    act(() => finishRefetch());
    await waitFor(() => expect(result.current.cities.data).toEqual([]));
    expect(client.isMutating()).toBe(0);
  });
});
