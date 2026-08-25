import { renderHook, waitFor, act } from "@testing-library/react";
import { useRecordDetail } from "./use-record-detail";

describe("useRecordDetail", () => {
  it("is loading until the fetch resolves, then exposes data", async () => {
    const fetcher = jest.fn(async (id: string) => ({ id, label: "loaded" }));
    const { result } = renderHook(() => useRecordDetail("a", fetcher));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ id: "a", label: "loaded" });
    expect(result.current.error).toBe(false);
  });

  it("does nothing for a null id", () => {
    const fetcher = jest.fn(async (id: string) => ({ id }));
    const { result } = renderHook(() => useRecordDetail(null, fetcher));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("re-loads to loading when the id changes", async () => {
    const fetcher = jest.fn(async (id: string) => ({ id }));
    const { result, rerender } = renderHook(({ id }) => useRecordDetail(id, fetcher), {
      initialProps: { id: "a" },
    });
    await waitFor(() => expect(result.current.data).toEqual({ id: "a" }));

    rerender({ id: "b" });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ id: "b" }));
  });

  it("surfaces an error and recovers via reload", async () => {
    let fail = true;
    const fetcher = jest.fn(async (id: string) => {
      if (fail) throw new Error("boom");
      return { id };
    });
    const { result } = renderHook(() => useRecordDetail("a", fetcher));

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.data).toBeNull();

    fail = false;
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toEqual({ id: "a" }));
    expect(result.current.error).toBe(false);
  });
});
