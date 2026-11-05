import { render, screen } from "@testing-library/react";
import { DetailSection } from "./detail-section";

describe("DetailSection", () => {
  it("renders each section as its own region with a level 3 heading", () => {
    render(
      <>
        <DetailSection title="User">
          <p>Last value</p>
        </DetailSection>
        <DetailSection title="Target">
          <p>Next value</p>
        </DetailSection>
      </>,
    );
    const sections = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.closest("section"));
    expect(sections).toHaveLength(2);
    expect(sections[0]).toHaveTextContent("Last value");
    expect(sections[1]).toHaveTextContent("Next value");
  });
});
