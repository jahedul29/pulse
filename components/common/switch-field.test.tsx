import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SwitchField } from "./switch-field";

describe("SwitchField", () => {
  it("compact variant shows the on/off label and toggles", async () => {
    const onCheckedChange = jest.fn();
    render(
      <SwitchField
        label="Status"
        checked
        onCheckedChange={onCheckedChange}
        checkedLabel="Active"
        uncheckedLabel="Inactive"
      />,
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it("description variant renders the helper line", () => {
    render(
      <SwitchField
        label="Active"
        checked={false}
        onCheckedChange={jest.fn()}
        description="Route is live and sending alerts."
      />,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Route is live and sending alerts.")).toBeInTheDocument();
  });
});
