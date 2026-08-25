import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders its children", () => {
    render(<StatusBadge tone="success">Active</StatusBadge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies the tone class", () => {
    render(<StatusBadge tone="danger">Locked</StatusBadge>);
    expect(screen.getByText("Locked")).toHaveClass("bg-danger");
  });

  it("adds equal-width min-width by default and drops it when disabled", () => {
    const { rerender } = render(<StatusBadge tone="neutral">A</StatusBadge>);
    expect(screen.getByText("A")).toHaveClass("min-w-[var(--badge-w)]");
    rerender(
      <StatusBadge tone="neutral" equalWidth={false}>
        A
      </StatusBadge>,
    );
    expect(screen.getByText("A")).not.toHaveClass("min-w-[var(--badge-w)]");
  });
});
