import { render, screen } from "@testing-library/react";
import { Field } from "./field";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => (key === "required" ? "required" : key),
}));

describe("Field required mark", () => {
  it("adds a visual asterisk hidden from assistive tech plus screen-reader text", () => {
    render(
      <Field label="Role name" htmlFor="role-name" required>
        <input id="role-name" />
      </Field>,
    );

    const label = screen.getByText("Role name").closest("label") as HTMLElement;
    const asterisk = label.querySelector('[aria-hidden="true"]');
    expect(asterisk).toHaveTextContent("*");
    expect(label.querySelector(".sr-only")).toHaveTextContent("required");
    expect(screen.getByRole("textbox", { name: "Role name required" })).toBeInTheDocument();
  });

  it("renders no mark for optional fields", () => {
    render(
      <Field label="Description" htmlFor="desc">
        <input id="desc" />
      </Field>,
    );

    const label = screen.getByText("Description").closest("label") as HTMLElement;
    expect(label).toHaveTextContent(/^Description$/);
    expect(screen.getByRole("textbox", { name: "Description" })).toBeInTheDocument();
  });
});
