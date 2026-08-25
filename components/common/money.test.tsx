import { render, screen } from "@testing-library/react";
import { Money } from "./money";

describe("Money", () => {
  it("formats the value with two decimals and grouping", () => {
    render(<Money value={1234.5} />);
    expect(screen.getByText("1,234.50")).toBeInTheDocument();
  });

  it("renders the dirham sign alongside the amount", () => {
    const { container } = render(<Money value={0} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("0.00")).toBeInTheDocument();
  });
});
