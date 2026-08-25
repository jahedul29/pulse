import { render, screen } from "@testing-library/react";
import { DiffViewer } from "./diff-viewer";

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
});
