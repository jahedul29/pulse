import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HideButton } from "./hide-button";

describe("HideButton", () => {
  it("exposes an accessible label and fires onClick", async () => {
    const onClick = jest.fn();
    render(<HideButton onClick={onClick} label="Hide card" />);
    const btn = screen.getByRole("button", { name: "Hide card" });
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
