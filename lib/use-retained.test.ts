import { renderHook } from "@testing-library/react";
import { useRetained } from "./use-retained";

describe("useRetained", () => {
  it("returns the live value, then retains the last non-null through null", () => {
    const { result, rerender } = renderHook(({ v }) => useRetained(v), {
      initialProps: { v: null as string | null },
    });
    expect(result.current).toBeNull();

    rerender({ v: "a" });
    expect(result.current).toBe("a");

    rerender({ v: null });
    expect(result.current).toBe("a");

    rerender({ v: "b" });
    expect(result.current).toBe("b");

    rerender({ v: null });
    expect(result.current).toBe("b");
  });
});
