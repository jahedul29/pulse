import { render, screen } from "@testing-library/react";
import { DiffLegend, DiffViewer } from "./diff-viewer";

describe("DiffViewer", () => {
  it("shows before and after values per column", () => {
    render(<DiffViewer changes={[{ column: "status", before: "paid", after: "refunded" }]} />);
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("refunded")).toBeInTheDocument();
  });

  it("renders the empty marker for a null side", () => {
    render(<DiffViewer changes={[{ column: "token", before: null, after: "abc" }]} />);
    expect(screen.getByText("∅")).toBeInTheDocument();
    expect(screen.getByText("abc")).toBeInTheDocument();
  });

  it("lays the changes out as flush field, before and after rows, with no frame of their own", () => {
    const { container } = render(
      <DiffViewer
        changes={[{ column: "invited_by_admin_id", before: null, after: "Dana" }]}
        labelFor={() => "Invited by admin ID"}
        labels={{ field: "Field", before: "Before", after: "After" }}
      />,
    );
    expect(screen.getByText("Invited by admin ID")).toBeInTheDocument();
    expect(screen.getByText("invited_by_admin_id")).toBeInTheDocument();
    expect(screen.getByText("Field")).toBeInTheDocument();
    expect(container.firstElementChild?.children).toHaveLength(2);
  });

  it("puts a marker before each legend entry, hidden from screen readers", () => {
    render(<DiffLegend labels={{ removed: "Removed value", added: "Added value", empty: "Empty value" }} />);
    for (const label of ["Removed value", "Added value", "Empty value"]) {
      const marker = screen.getByText(label).firstElementChild;
      expect(marker).toHaveAttribute("aria-hidden");
    }
  });

  it("shows changed values as monospace before and after pills, and masked values without a pill", () => {
    render(
      <DiffViewer
        changes={[
          { column: "status", before: "PENDING", after: "REVOKED" },
          { column: "sent_email", before: null, after: "{••••" },
        ]}
      />,
    );
    expect(screen.getByText("PENDING")).toHaveClass("font-mono", "line-through");
    expect(screen.getByText("REVOKED")).toHaveClass("font-mono");
    expect(screen.getByText("{••••")).not.toHaveClass("font-mono");
  });
});
