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

  it("passes the disabled state and an explicit switch name through", async () => {
    const onCheckedChange = jest.fn();
    render(
      <SwitchField
        label="Travel time"
        checked
        onCheckedChange={onCheckedChange}
        description="Inherited"
        disabled
        ariaLabel="Enforce Travel time"
      />,
    );
    const toggle = screen.getByRole("switch", { name: "Enforce Travel time" });
    expect(toggle).toBeDisabled();
    expect(screen.getByText("Inherited").parentElement).toHaveClass("group-has-[:disabled]/switch-field:opacity-60");
    await userEvent.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
