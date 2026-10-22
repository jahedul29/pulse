import { changesJson, jsonPreview, toJsonText } from "./export-json";

describe("changesJson", () => {
  it("keys the changes by column with before and after", () => {
    expect(changesJson([{ column: "status", before: null, after: "PENDING" }])).toEqual({
      status: { before: null, after: "PENDING" },
    });
  });
});

describe("jsonPreview", () => {
  it("shortens long lists and says how many items are left out", () => {
    const points = Array.from({ length: 30 }, (_, index) => ({ index }));
    const preview = jsonPreview({ points }, (count) => `+${count} more`, 25) as { points: unknown[] };
    expect(preview.points).toHaveLength(26);
    expect(preview.points.at(-1)).toBe("+5 more");
  });

  it("keeps short lists and plain values as they are", () => {
    expect(jsonPreview({ ids: [1, 2], name: "Dubai" })).toEqual({ ids: [1, 2], name: "Dubai" });
  });
});

describe("toJsonText", () => {
  it("pretty prints and turns a missing value into null", () => {
    expect(toJsonText({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(toJsonText(undefined)).toBe("null");
  });
});
