import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { useOrderedRows, useRecordPager, type ServerPage } from "./use-record-pager";

type Row = { id: string };

const pageOf = (pageIndex: number, size = 3) =>
  Array.from({ length: size }, (_, i) => ({ id: `r${pageIndex * size + i + 1}` }));

const go = jest.fn();
const prefetch = jest.fn();

beforeEach(() => {
  go.mockClear();
  prefetch.mockClear();
});

function useServerHarness(total: number, startId: string, startPage = 0) {
  const [pageIndex, setPageIndex] = useState(startPage);
  const [loaded, setLoaded] = useState(startPage);
  const [activeId, setActiveId] = useState<string | null>(startId);
  const [failed, setFailed] = useState(false);
  const rows = pageOf(loaded).filter((row) => Number(row.id.slice(1)) <= total);
  const page: ServerPage = {
    index: pageIndex,
    size: 3,
    total,
    loaded,
    failed,
    go: (index) => {
      go(index);
      setPageIndex(index);
    },
    prefetch,
  };
  const pager = useRecordPager<Row>({
    rows,
    getId: (row) => row.id,
    activeId,
    onSelect: (row) => setActiveId(row.id),
    page,
  });
  return { pager, activeId, setActiveId, setLoaded, setFailed };
}

describe("useRecordPager without server pages", () => {
  it("walks the rows it is given and stops at both ends", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const { result } = renderHook(() => {
      const [activeId, setActiveId] = useState<string | null>("a");
      const pager = useRecordPager<Row>({ rows, getId: (row) => row.id, activeId, onSelect: (row) => setActiveId(row.id) });
      return { pager, activeId };
    });
    expect(result.current.pager).toMatchObject({ position: 1, total: 3, canPrev: false, canNext: true });
    act(() => result.current.pager.step(1));
    act(() => result.current.pager.step(1));
    expect(result.current.activeId).toBe("c");
    expect(result.current.pager.canNext).toBe(false);
    act(() => result.current.pager.step(1));
    expect(result.current.activeId).toBe("c");
  });

  it("hides the position when the open record is not in the list", () => {
    const { result } = renderHook(() =>
      useRecordPager<Row>({ rows: [{ id: "a" }], getId: (row) => row.id, activeId: "zzz", onSelect: jest.fn() }),
    );
    expect(result.current).toMatchObject({ position: 0, canPrev: false, canNext: false });
  });
});

describe("useRecordPager across server pages", () => {
  it("counts the position across pages and moves to the next page's first record", () => {
    const { result } = renderHook(() => useServerHarness(8, "r3"));
    expect(result.current.pager).toMatchObject({ position: 3, total: 8, canNext: true });
    expect(prefetch).toHaveBeenCalledWith(1);
    act(() => result.current.pager.step(1));
    expect(go).toHaveBeenCalledWith(1);
    expect(result.current.pager.pending).toBe(1);
    expect(result.current.pager.canNext).toBe(false);
    expect(result.current.activeId).toBe("r3");
    act(() => result.current.setLoaded(1));
    expect(result.current.activeId).toBe("r4");
    expect(result.current.pager).toMatchObject({ position: 4, pending: null, canPrev: true });
  });

  it("moves to the previous page's last record", () => {
    const { result } = renderHook(() => useServerHarness(8, "r4", 1));
    expect(prefetch).toHaveBeenCalledWith(0);
    act(() => result.current.pager.step(-1));
    expect(go).toHaveBeenCalledWith(0);
    act(() => result.current.setLoaded(0));
    expect(result.current.activeId).toBe("r3");
    expect(result.current.pager.position).toBe(3);
  });

  it("stops at the last record of the whole result", () => {
    const { result } = renderHook(() => useServerHarness(8, "r8", 2));
    expect(result.current.pager).toMatchObject({ position: 8, canNext: false, canPrev: true });
  });

  it("keeps the right position while the next page loads", () => {
    const { result } = renderHook(() => useServerHarness(8, "r3"));
    act(() => result.current.pager.step(1));
    expect(result.current.pager.position).toBe(3);
    act(() => result.current.setLoaded(1));
    expect(result.current.pager.position).toBe(4);
  });

  it("can page again from the record a page crossing started from", () => {
    const { result } = renderHook(() => useServerHarness(8, "r3"));
    act(() => result.current.pager.step(1));
    act(() => result.current.setLoaded(1));
    expect(result.current.activeId).toBe("r4");
    act(() => {
      result.current.setLoaded(0);
      result.current.setActiveId("r3");
    });
    expect(result.current.pager).toMatchObject({ position: 3, pending: null, canNext: true, canPrev: true });
  });

  it("lets the admin page again when the next page fails to load", () => {
    const { result } = renderHook(() => useServerHarness(8, "r3"));
    act(() => result.current.pager.step(1));
    expect(result.current.pager.pending).toBe(1);
    act(() => result.current.setFailed(true));
    expect(result.current.pager.pending).toBeNull();
    expect(result.current.activeId).toBe("r3");
  });
});

describe("useOrderedRows", () => {
  const idOf = (row: Row) => row.id;

  it("returns the rows in the order the table reports, skipping ids that are gone", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const { result } = renderHook(() => useOrderedRows(rows, idOf));
    expect(result.current[0]).toEqual([]);
    act(() => result.current[1](["c", "x", "a"]));
    expect(result.current[0]).toEqual([{ id: "c" }, { id: "a" }]);
  });
});

