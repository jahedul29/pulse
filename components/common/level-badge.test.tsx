import { render, screen } from "@testing-library/react";
import { LevelBadge } from "./level-badge";

describe("LevelBadge", () => {
  it("shows a coloured dot in front of the level, in a soft pill rather than a solid button-like fill", () => {
    render(<LevelBadge tone="danger">Critical</LevelBadge>);
    const badge = screen.getByText("Critical");
    expect(badge).toHaveClass("rounded-full", "border", "bg-danger/10", "justify-center");
    expect(badge).not.toHaveClass("bg-danger");
    expect(badge.firstElementChild).toHaveAttribute("aria-hidden");
    expect(badge.firstElementChild).toHaveClass("size-1.5", "rounded-full", "bg-danger");
  });

  it("uses a grey dot for informational levels", () => {
    render(<LevelBadge tone="neutral">Info</LevelBadge>);
    expect(screen.getByText("Info").firstElementChild).toHaveClass("bg-muted-foreground");
  });
});
