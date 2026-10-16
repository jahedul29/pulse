import { createSelection, HISTORY_LIMIT } from "./selection";

describe("selection", () => {
  it("counts cells added and dropped against what was saved", () => {
    const selection = createSelection();
    expect(selection.getSnapshot().loaded).toBe(false);
    selection.load(["A", "B", "C"]);
    expect(selection.getSnapshot()).toMatchObject({ loaded: true, count: 3, dirty: false });

    selection.applyCodes(["C", "D"], "toggle");
    expect(selection.getSnapshot()).toMatchObject({ count: 3, addedCount: 1, removedCount: 1, dirty: true });

    selection.applyCodes(["C"], "add");
    selection.applyCodes(["D"], "remove");
    expect(selection.getSnapshot()).toMatchObject({ count: 3, addedCount: 0, removedCount: 0, dirty: false });
  });

  it("records a whole stroke as one undo step", () => {
    const selection = createSelection();
    selection.load(["A"]);
    const stroke = selection.beginStroke(true);
    expect(stroke.paint("B")).toEqual({ added: ["B"], removed: [] });
    expect(stroke.paint("B")).toBeNull();
    stroke.paint("C");
    expect(stroke.end()).toEqual({ added: ["B", "C"], removed: [] });

    expect(selection.undo()).toEqual({ added: [], removed: ["B", "C"] });
    expect(selection.getSnapshot()).toMatchObject({ count: 1, dirty: false, canUndo: false, canRedo: true });
    selection.redo();
    expect(selection.getSnapshot()).toMatchObject({ count: 3, canRedo: false });
  });

  it("drops every cell and brings them back with undo or revert", () => {
    const selection = createSelection();
    selection.load(["A", "B"]);
    selection.dropAll();
    expect(selection.getSnapshot()).toMatchObject({ count: 0, removedCount: 2 });
    selection.undo();
    expect(selection.getSnapshot().count).toBe(2);
    selection.dropAll();
    selection.revert();
    expect(selection.getSnapshot()).toMatchObject({ count: 2, dirty: false });
  });

  it("clears redo after a new change and caps history", () => {
    const selection = createSelection();
    selection.load([]);
    selection.toggle("A");
    selection.undo();
    selection.toggle("B");
    expect(selection.getSnapshot().canRedo).toBe(false);
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) selection.toggle(`C${i}`);
    let undone = 0;
    while (selection.undo()) undone += 1;
    expect(undone).toBe(HISTORY_LIMIT);
  });

  it("makes the current cells the saved state after a save", () => {
    const selection = createSelection();
    selection.load(["A"]);
    selection.toggle("B");
    selection.markSaved(selection.codes(), null);
    expect(selection.getSnapshot()).toMatchObject({ dirty: false, count: 2 });
  });

  it("keeps edits made while a save was running as unsaved", () => {
    const selection = createSelection();
    selection.load(["A"]);
    selection.toggle("B");
    const sent = selection.codes();
    selection.toggle("C");
    selection.undo();
    selection.undo();
    selection.markSaved(sent, null);
    expect(selection.getSnapshot()).toMatchObject({ dirty: true, count: 1, addedCount: 0, removedCount: 1 });
    selection.redo();
    expect(selection.getSnapshot()).toMatchObject({ dirty: false, count: 2 });
  });

  it("keeps the same snapshot until something changes and notifies listeners", () => {
    const selection = createSelection();
    const listener = jest.fn();
    selection.subscribe(listener);
    selection.load(["A"]);
    const first = selection.getSnapshot();
    expect(selection.getSnapshot()).toBe(first);
    selection.applyCodes(["A"], "add");
    expect(selection.getSnapshot()).toBe(first);
    selection.toggle("B");
    expect(selection.getSnapshot()).not.toBe(first);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("tracks the centre, marking a moved centre as unsaved until it is saved", () => {
    const selection = createSelection();
    selection.load(["A"], { point: [55, 25], source: "saved" });
    expect(selection.getSnapshot()).toMatchObject({ centre: [55, 25], centreSource: "saved", dirty: false });
    selection.setCentre([55.1, 25], "manual");
    expect(selection.getSnapshot()).toMatchObject({ centreSource: "manual", dirty: true });
    selection.markSaved(selection.codes(), [55.1, 25]);
    expect(selection.getSnapshot()).toMatchObject({ centre: [55.1, 25], centreSource: "saved", dirty: false });
    selection.setCentre([55.2, 25.1], "auto");
    expect(selection.getSnapshot()).toMatchObject({ centreSource: "auto", dirty: true });
  });

  it("puts a moved centre back when reverting", () => {
    const selection = createSelection();
    selection.load(["A"], { point: [55, 25], source: "saved" });
    selection.setCentre([55.3, 25.2], "auto");
    expect(selection.getSnapshot().dirty).toBe(true);
    selection.revert();
    expect(selection.getSnapshot()).toMatchObject({ centre: [55, 25], centreSource: "saved", dirty: false });
  });
});
