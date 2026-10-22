import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import mockMessages from "../../messages/en.json";
import { PeriodFilter } from "./period-filter";

jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    String((mockMessages as Record<string, Record<string, unknown>>)[namespace]?.[key] ?? key),
}));

function Harness({ initial, onChange }: { initial?: [number, number]; onChange: (range: unknown) => void }) {
  const [value, setValue] = useState<unknown>(initial);
  return (
    <PeriodFilter
      value={value}
      onChange={(range) => {
        setValue(range);
        onChange(range);
      }}
    />
  );
}

describe("PeriodFilter", () => {
  it("starts on Any time and applies a preset as an exact time range", async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    const trigger = screen.getByRole("combobox", { name: "Period" });
    expect(trigger).toHaveTextContent("Any time");
    const before = Date.now();
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("option", { name: "Last hour" }));
    const [from, to] = onChange.mock.calls[0][0] as [number, number];
    expect(to).toBeGreaterThanOrEqual(before);
    expect(to - from).toBe(3_600_000);
    expect(trigger).toHaveTextContent("Last hour");
  });

  it("shows a custom range picked in the column filter and clears back to Any time", async () => {
    const onChange = jest.fn();
    render(<Harness initial={[1, 2]} onChange={onChange} />);
    const trigger = screen.getByRole("combobox", { name: "Period" });
    expect(trigger).toHaveTextContent("Custom range");
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("option", { name: "Any time" }));
    expect(onChange).toHaveBeenCalledWith(undefined);
    expect(trigger).toHaveTextContent("Any time");
  });
});
