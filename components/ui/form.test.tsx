import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Form } from "./form";

function setup() {
  const onSubmit = jest.fn();
  render(
    <Form onSubmit={onSubmit}>
      <input aria-label="name" />
      <textarea aria-label="notes" />
      <button type="button">Helper</button>
    </Form>,
  );
  return { onSubmit };
}

describe("Form Enter-submit", () => {
  it("submits when Enter is pressed in a text input", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText("name"), "abc{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not submit on Enter in a textarea (newline)", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText("notes"), "line{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit on Shift+Enter", async () => {
    const { onSubmit } = setup();
    const input = screen.getByLabelText("name");
    input.focus();
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit on Enter from a button", async () => {
    const { onSubmit } = setup();
    screen.getByRole("button", { name: "Helper" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
