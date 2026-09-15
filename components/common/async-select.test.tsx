import { render, screen, renderHook, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { nearBottom, useDebouncedValue, AsyncMultiFilter, type AsyncOptionsResult } from "./async-select";

describe("nearBottom", () => {
  it("is true within 24px of the bottom, false otherwise", () => {
    expect(nearBottom({ scrollTop: 80, clientHeight: 100, scrollHeight: 200 } as HTMLDivElement)).toBe(true);
    expect(nearBottom({ scrollTop: 0, clientHeight: 100, scrollHeight: 400 } as HTMLDivElement)).toBe(false);
  });
});

describe("useDebouncedValue", () => {
  it("debounces and trims", () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "" },
    });
    rerender({ value: "  hi  " });
    expect(result.current).toBe("");
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe("hi");
    jest.useRealTimers();
  });
});

const useStaticOptions = (search: string): AsyncOptionsResult => {
  const term = search.toLowerCase();
  const all = [
    { value: "1", label: "Email" },
    { value: "2", label: "SMS" },
  ];
  return {
    options: all.filter((option) => option.label.toLowerCase().includes(term)),
    isPending: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  };
};

describe("AsyncMultiFilter", () => {
  it("renders options and toggles selection", async () => {
    const onChange = jest.fn();
    render(<AsyncMultiFilter useOptions={useStaticOptions} value={[]} onChange={onChange} searchLabel="Search" />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    await userEvent.click(screen.getByText("SMS"));
    expect(onChange).toHaveBeenCalledWith(["2"]);
  });
});
