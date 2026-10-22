import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ServerTableState } from "@/components/common/data-table";
import { useServerPage } from "./use-server-page";

const server: ServerTableState = { pageIndex: 1, pageSize: 20, search: "", sorting: [], columnFilters: [] };

describe("useServerPage", () => {
  it("describes the loaded page and prefetches a neighbour with the same filters", () => {
    const client = new QueryClient();
    const prefetchQuery = jest.spyOn(client, "prefetchQuery").mockResolvedValue(undefined);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const queryFor = jest.fn((state: ServerTableState) => ({ queryKey: ["rows", state.pageIndex], queryFn: async () => [] }));

    const { result } = renderHook(
      () => useServerPage({ server, pageSize: 10, total: 95, data: { meta: { current_page: 2 } }, failed: false, queryFor }),
      { wrapper },
    );

    expect(result.current.page).toMatchObject({ index: 1, size: 20, total: 95, loaded: 1, failed: false });
    result.current.page.prefetch?.(2);
    expect(queryFor).toHaveBeenCalledWith({ ...server, pageIndex: 2 });
    expect(prefetchQuery).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["rows", 2] }));
  });

  it("falls back to the table's page size before the first server state arrives", () => {
    const { result } = renderHook(() =>
      useServerPage({ server: null, pageSize: 25, total: 0, data: undefined, failed: false, queryFor: () => ({ queryKey: ["x"], queryFn: async () => 0 }) }),
    );
    expect(result.current.page).toMatchObject({ index: 0, size: 25, loaded: 0 });
  });
});
