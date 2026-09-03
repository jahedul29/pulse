import { apiErrorMessage } from "./error-message";
import { ApiError } from "./errors";

const t = (key: string) => `t:${key}`;

describe("apiErrorMessage", () => {
  it("surfaces backend field messages from a validation error body", () => {
    const error = new ApiError("validation", 422, "Validation failed", {
      success: false,
      message: "Validation failed",
      errors: [{ field: "name", messages: ['Role name "admin" already exists.'] }],
      status: 422,
    });
    expect(apiErrorMessage(error, t)).toBe('Role name "admin" already exists.');
  });

  it("joins multiple field messages", () => {
    const error = new ApiError("validation", 422, "Validation failed", {
      errors: [
        { field: "a", messages: ["A is bad."] },
        { field: "b", messages: ["B is bad."] },
      ],
    });
    expect(apiErrorMessage(error, t)).toBe("A is bad. B is bad.");
  });

  it("handles the Laravel object-map error shape", () => {
    const error = new ApiError("validation", 422, "Validation failed", {
      errors: { name: ["Name is taken."], email: ["Email invalid."] },
    });
    expect(apiErrorMessage(error, t)).toBe("Name is taken. Email invalid.");
  });

  it("handles an object-map with a single string value", () => {
    const error = new ApiError("validation", 422, "Validation failed", { errors: { name: "Name is taken." } });
    expect(apiErrorMessage(error, t)).toBe("Name is taken.");
  });

  it("skips whitespace-only messages", () => {
    const error = new ApiError("validation", 422, "x", { errors: [{ field: "n", messages: ["   ", ""] }] });
    expect(apiErrorMessage(error, t)).toBe("t:validation");
  });

  it("falls back to the localized code message when no field errors", () => {
    expect(apiErrorMessage(new ApiError("server", 500, "boom"), t)).toBe("t:server");
  });

  it("falls back to unknown for non-ApiError", () => {
    expect(apiErrorMessage(new Error("x"), t)).toBe("t:unknown");
  });
});
