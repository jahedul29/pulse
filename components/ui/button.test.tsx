import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("looks and acts disabled when it stays focusable for a tooltip", async () => {
    const onClick = jest.fn();
    render(
      <Button focusableWhenDisabled disabled onClick={onClick}>
        Save changes
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).not.toHaveAttribute("disabled");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("data-disabled");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("uses the native disabled state otherwise", () => {
    render(<Button disabled>Revert</Button>);
    expect(screen.getByRole("button", { name: "Revert" })).toBeDisabled();
  });
});
