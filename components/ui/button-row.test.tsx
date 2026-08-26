import { render, screen } from "@testing-library/react";
import { ButtonRow } from "./button-row";

describe("ButtonRow", () => {
  it("stacks full-width on mobile by default", () => {
    render(
      <ButtonRow>
        <button>Cancel</button>
        <button>Save</button>
      </ButtonRow>,
    );
    const row = screen.getByText("Cancel").parentElement!;
    expect(row).toHaveClass("flex", "flex-col");
    expect(row).not.toHaveClass("grid-cols-2");
    expect(row).toHaveClass("[&>*]:min-w-24");
  });

  it("splits into two equal halves on mobile when layout='split'", () => {
    render(
      <ButtonRow layout="split">
        <button>Cancel</button>
        <button>Save</button>
      </ButtonRow>,
    );
    const row = screen.getByText("Cancel").parentElement!;
    expect(row).toHaveClass("grid", "grid-cols-2");
    expect(row).not.toHaveClass("flex-col");
    expect(row).toHaveClass("sm:grid-cols-none");
  });
});
