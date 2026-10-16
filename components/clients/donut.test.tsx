import { render, screen } from "@testing-library/react";
import { Donut } from "./donut";

const data = [
  { name: "Premium", value: 60, fill: "#4f008b" },
  { name: "Basic", value: 40, fill: "#ff375e" },
];

describe("Donut", () => {
  it("renders at a fixed size without the recharts zero-size warning", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = render(<Donut data={data} />);

    const chart = container.querySelector(".recharts-wrapper");
    expect(chart).toHaveClass("z-10");
    expect(chart).toHaveStyle({ width: "132px", height: "132px" });
    expect(warn.mock.calls.some(([message]) => String(message).includes("should be greater than 0"))).toBe(false);
    expect(screen.getByText("Premium", { selector: "span.uppercase" })).toBeInTheDocument();
    warn.mockRestore();
  });
});
