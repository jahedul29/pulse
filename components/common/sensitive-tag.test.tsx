import { render, screen } from "@testing-library/react";
import { SensitiveTag, SensitivityDot } from "./sensitive-tag";

describe("SensitiveTag", () => {
  it("renders nothing when there are no kinds", () => {
    const { container } = render(<SensitiveTag kinds={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one accessible marker per kind", () => {
    render(<SensitiveTag kinds={["financial", "pii", "destructive"]} />);
    expect(screen.getByLabelText("Financial data")).toBeInTheDocument();
    expect(screen.getByLabelText("Personal data")).toBeInTheDocument();
    expect(screen.getByLabelText("Destructive action")).toBeInTheDocument();
  });

  it("shows text and honours custom labels when showLabel is set", () => {
    render(<SensitiveTag kinds={["financial"]} labels={{ financial: "Money" }} showLabel />);
    expect(screen.getByText("Money")).toBeInTheDocument();
    expect(screen.getByLabelText("Money")).toBeInTheDocument();
  });
});

describe("SensitivityDot", () => {
  it("uses its label as the accessible name", () => {
    render(<SensitivityDot kind="pii" />);
    expect(screen.getByLabelText("Personal data")).toBeInTheDocument();
  });
});
