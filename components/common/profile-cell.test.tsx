import { render, screen } from "@testing-library/react";
import { ProfileCell } from "./profile-cell";

describe("ProfileCell", () => {
  it("derives initials from the name", () => {
    render(<ProfileCell name="Dana Okonkwo" />);
    expect(screen.getByText("Dana Okonkwo")).toBeInTheDocument();
    expect(screen.getByText("DO")).toBeInTheDocument();
  });

  it("uses explicit initials and a subtitle", () => {
    render(<ProfileCell name="Sam" initials="SA" subtitle="owner@abapro.health" />);
    expect(screen.getByText("SA")).toBeInTheDocument();
    expect(screen.getByText("owner@abapro.health")).toBeInTheDocument();
  });

  it("shows an icon instead of initials when unmatched", () => {
    const { container } = render(<ProfileCell name="Unknown / unmatched" unmatched />);
    expect(screen.getByText("Unknown / unmatched")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
