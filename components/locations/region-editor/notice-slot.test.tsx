import { render, screen } from "@testing-library/react";
import { NoticeSlot } from "./notice-slot";

describe("NoticeSlot", () => {
  it("keeps the last notice mounted while it fades out, hidden from assistive technology", () => {
    const { container, rerender } = render(<NoticeSlot notice={{ text: "Zoom in to see the cell grid" }} />);
    const slot = container.firstElementChild!;
    expect(slot).not.toHaveAttribute("aria-hidden");
    rerender(<NoticeSlot notice={null} />);
    expect(screen.getByText("Zoom in to see the cell grid")).toBeInTheDocument();
    expect(slot).toHaveAttribute("aria-hidden", "true");
    expect(slot).toHaveAttribute("inert");
  });
});
