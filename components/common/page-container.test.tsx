import { render, screen } from "@testing-library/react";
import { PageContainer } from "./page-container";

describe("PageContainer", () => {
  it("lets data pages fill the content area up to the 1920px frame", () => {
    render(<PageContainer aria-label="page" className="flex flex-col gap-6">content</PageContainer>);
    const page = screen.getByLabelText("page");
    expect(page).toHaveAttribute("data-page", "data");
    expect(page).toHaveClass("mx-auto", "w-full", "max-w-[120rem]", "flex", "gap-6");
    expect(page).not.toHaveClass("max-w-6xl");
  });

  it("starts form pages at the frame's leading edge with a capped column", () => {
    render(<PageContainer variant="form" aria-label="form">content</PageContainer>);
    const column = screen.getByLabelText("form");
    expect(column).toHaveClass("w-full", "max-w-6xl");
    expect(column).not.toHaveClass("mx-auto");
    expect(column.parentElement).toHaveAttribute("data-page", "form");
    expect(column.parentElement).toHaveClass("mx-auto", "max-w-[120rem]");
  });
});
