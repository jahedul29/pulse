import { render, screen } from "@testing-library/react";
import { CardAction, CardDescription, CardHeader, CardTitle } from "./card";

describe("CardHeader with an action", () => {
  it("keeps the action on the title row and lets the subtitle span the full width", () => {
    render(
      <CardHeader>
        <CardTitle>Direct permissions</CardTitle>
        <CardDescription>Add a single extra permission without changing the admin role.</CardDescription>
        <CardAction>
          <button type="button">Add permission</button>
        </CardAction>
      </CardHeader>,
    );

    const action = screen.getByRole("button", { name: "Add permission" }).parentElement as HTMLElement;
    expect(action).toHaveClass("col-start-2", "row-start-1");
    expect(action).not.toHaveClass("row-span-2");
    expect(screen.getByText(/Add a single extra permission/)).toHaveClass("col-span-full");
  });
});
