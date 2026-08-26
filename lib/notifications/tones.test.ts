import { statusTone, urgencyTone } from "./tones";

describe("notification tones", () => {
  it("maps delivery status to a tone", () => {
    expect(statusTone("delivered")).toBe("success");
    expect(statusTone("failed")).toBe("danger");
    expect(statusTone("pending")).toBe("warning");
  });

  it("maps urgency to its color-coded tone (high=red, medium=amber, low=green)", () => {
    expect(urgencyTone("high")).toBe("danger");
    expect(urgencyTone("medium")).toBe("warning");
    expect(urgencyTone("low")).toBe("success");
  });
});
