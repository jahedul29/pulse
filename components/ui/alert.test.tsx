import { render, screen } from "@testing-library/react";
import { Alert } from "./alert";

describe("Alert", () => {
  it("is an alert by default", () => {
    render(<Alert title="Couldn't save">Try again.</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save");
  });

  it("can be a plain informational note", () => {
    render(
      <Alert role="note" title="Browser-only preview">
        Saved only in this browser.
      </Alert>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Browser-only preview");
  });
});
