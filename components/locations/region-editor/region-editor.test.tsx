import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import mockMessages from "../../../messages/en.json";
import { cellsInBounds, type LngLat } from "@/lib/mgrs/grid";
import { cellCode } from "@/lib/mgrs/mgrs";
import { DEFAULT_REGION_EDITOR_PREFS, useUiStore } from "@/lib/ui-store";
import { RegionEditor, type RegionEditorProps } from "./region-editor";

const mockPush = jest.fn();
let mockController: ReturnType<typeof createFakeController>;

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() } }));
jest.mock("./map/load-region-map", () => ({ loadRegionMap: jest.fn(async () => mockController) }));

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, unknown>;
  const resolve = (path: string): unknown =>
    path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
  const closingBrace = (text: string, open: number) => {
    let depth = 0;
    for (let i = open; i < text.length; i++) {
      if (text[i] === "{") depth += 1;
      if (text[i] === "}") depth -= 1;
      if (depth === 0) return i;
    }
    return text.length - 1;
  };
  const choosePlural = (text: string, values: Record<string, unknown>): string => {
    const match = /\{(\w+), plural, /.exec(text);
    if (!match) return text;
    const start = match.index;
    const end = closingBrace(text, start);
    const options: Record<string, string> = {};
    let cursor = start + match[0].length;
    while (cursor < end) {
      const keyMatch = /\s*(\w+)\s*\{/.exec(text.slice(cursor, end));
      if (!keyMatch) break;
      const bodyStart = cursor + keyMatch.index + keyMatch[0].length - 1;
      const bodyEnd = closingBrace(text, bodyStart);
      options[keyMatch[1]] = text.slice(bodyStart + 1, bodyEnd);
      cursor = bodyEnd + 1;
    }
    const branch = Number(values[match[1]]) === 1 && options.one !== undefined ? options.one : options.other;
    return choosePlural(text.slice(0, start) + branch + text.slice(end + 1), values);
  };
  return {
    useLocale: () => "en",
    useTranslations: (namespace: string) => (key: string, values: Record<string, unknown> = {}) => {
      const value = resolve(`${namespace}.${key}`);
      let text = choosePlural(typeof value === "string" ? value : key, values);
      for (const [name, replacement] of Object.entries(values)) text = text.split(`{${name}}`).join(String(replacement));
      return text;
    },
  };
});

const WEST = 55.25;
const EAST = 55.35;
const NORTH = 25.1;
const SOUTH = 25.04;
const WIDTH = 800;
const HEIGHT = 600;

function createFakeController() {
  const canvas = document.createElement("div");
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: WIDTH, height: HEIGHT, right: WIDTH, bottom: HEIGHT, x: 0, y: 0, toJSON: () => ({}) });
  const viewListeners = new Set<(zoom: number) => void>();
  return {
    canvas,
    unproject: (x: number, y: number): LngLat => [WEST + (x / WIDTH) * (EAST - WEST), NORTH - (y / HEIGHT) * (NORTH - SOUTH)],
    project: ([longitude, latitude]: LngLat) => ({
      x: ((longitude - WEST) / (EAST - WEST)) * WIDTH,
      y: ((NORTH - latitude) / (NORTH - SOUTH)) * HEIGHT,
    }),
    zoom: () => 12,
    setInteraction: jest.fn(),
    setCursor: jest.fn(),
    setPicked: jest.fn(),
    applyChange: jest.fn(),
    setOtherRegions: jest.fn(),
    setLayerVisibility: jest.fn(),
    setHoverCell: jest.fn(),
    setDraft: jest.fn(),
    setCentre: jest.fn(),
    setBackground: jest.fn(async () => "grey" as const),
    setLabels: jest.fn(),
    background: () => "grey" as const,
    fitBounds: jest.fn(),
    zoomBy: jest.fn(),
    centre: (): LngLat => [55.3, 25.07],
    onViewChange: (listener: (zoom: number) => void) => {
      viewListeners.add(listener);
      return () => viewListeners.delete(listener);
    },
    onCentreMoved: () => () => undefined,
    destroy: jest.fn(),
  };
}

if (!("PointerEvent" in window)) {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  Object.assign(window, { PointerEvent: TestPointerEvent });
}

function cellsSection() {
  return screen.getByRole("region", { name: "Cells" });
}

async function findCount(count: number) {
  return within(await screen.findByRole("region", { name: "Cells" })).findByText(count === 1 ? "1 cell" : `${count} cells`);
}

const startingCodes = cellsInBounds({ west: 55.29, south: 25.06, east: 55.31, north: 25.08 }).cells.map(cellCode);

function renderEditor(overrides: Partial<RegionEditorProps> = {}) {
  const props: RegionEditorProps = {
    region: {
      id: 4,
      name: "Dubai",
      alternateName: "دبي",
      code: "DU-01",
      active: true,
      centre: null,
      lastSavedAt: null,
    },
    picker: {
      countries: [
        { id: 1, label: "United Arab Emirates" },
        { id: 2, label: "China" },
      ],
      countryId: 1,
      onCountryChange: jest.fn(),
      regions: [
        { id: 4, label: "Dubai", code: "DU-01", mapped: true, active: true },
        { id: 5, label: "Sharjah", code: "SH-01", mapped: true, active: true },
        { id: 9, label: "Al Qua'a", code: null, mapped: false, active: false },
      ],
      onCreateRegion: jest.fn(),
    },
    coverage: { status: "ready", codes: startingCodes, onRetry: jest.fn() },
    otherRegions: [],
    canEdit: true,
    conflict: false,
    onReload: jest.fn(),
    onSave: jest.fn(async () => true),
    onSwitchRegion: jest.fn(),
    onEditDetails: jest.fn(),
    onDeleteRegion: jest.fn(async () => true),
    ...overrides,
  };
  render(<RegionEditor {...props} />);
  return props;
}

describe("RegionEditor", () => {
  beforeEach(() => {
    useUiStore.setState({ regionEditor: DEFAULT_REGION_EDITOR_PREFS });
    mockController = createFakeController();
    mockPush.mockReset();
  });

  it("loads the region's cells, fits the map to them and places an automatic centre", async () => {
    renderEditor();
    expect(await findCount(startingCodes.length)).toBeInTheDocument();
    expect(mockController.setPicked).toHaveBeenCalledWith(startingCodes);
    expect(mockController.fitBounds).toHaveBeenCalled();
    const centreTrigger = screen.getAllByRole("button").find((button) => (button.textContent ?? "").startsWith("Centre"))!;
    expect(centreTrigger.textContent).toMatch(/25\.\d{4}, 55\.\d{4}/);
    await waitFor(() => expect(mockController.setCentre).toHaveBeenCalledWith(expect.any(Array), { draggable: true }));
    expect(within(cellsSection()).getByRole("button", { name: "Save changes" })).toHaveAttribute("aria-disabled", "true");
  });

  it("adds the cells inside a rectangle drawn with Shift and saves them with the centre", async () => {
    const props = renderEditor();
    await findCount(startingCodes.length);
    fireEvent.click(screen.getAllByRole("button", { name: "Rectangle" })[0]);

    const canvas = mockController.canvas;
    act(() => {
      canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 80, clientY: 60, button: 0, shiftKey: true, bubbles: true }));
      canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 720, clientY: 540, shiftKey: true, bubbles: true }));
      canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 720, clientY: 540, shiftKey: true, bubbles: true }));
    });

    await waitFor(() => expect(screen.getAllByText("Unsaved changes").length).toBeGreaterThan(0));
    expect(mockController.applyChange).toHaveBeenCalled();
    fireEvent.click(within(cellsSection()).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(props.onSave).toHaveBeenCalled());
    const saved = (props.onSave as jest.Mock).mock.calls[0][0] as { codes: string[]; centre: LngLat };
    expect(saved.codes.length).toBeGreaterThan(startingCodes.length);
    expect(startingCodes.every((code) => saved.codes.includes(code))).toBe(true);
    expect(saved.centre[0]).toBeGreaterThan(WEST);
    expect(saved.centre[0]).toBeLessThan(EAST);
    await waitFor(() => expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument());
  });

  it("drops every cell after confirming, blocks saving an empty region, and undo brings them back", async () => {
    renderEditor();
    await findCount(startingCodes.length);
    fireEvent.click(within(cellsSection()).getByRole("button", { name: "Drop every cell" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Nothing is removed until you save/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Drop every cell" }));

    expect(await findCount(0)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/dropped/);
    expect(screen.getByText("A region needs at least one cell before it can be saved.")).toBeInTheDocument();
    expect(within(cellsSection()).getByRole("button", { name: "Save changes" })).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(within(cellsSection()).getByRole("button", { name: "Undo" }));
    expect(await findCount(startingCodes.length)).toBeInTheDocument();
  });

  it("keeps the delete confirmation open until the region is deleted", async () => {
    let finish: (deleted: boolean) => void = () => undefined;
    const onDeleteRegion = jest.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
    renderEditor({ onDeleteRegion });
    await findCount(startingCodes.length);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete region" })[0]);
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete region" }));
    expect(onDeleteRegion).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    await act(async () => finish(false));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete region" }));
    await act(async () => finish(true));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("asks before leaving the region with unsaved changes", async () => {
    renderEditor();
    await findCount(startingCodes.length);
    fireEvent.click(within(cellsSection()).getByRole("button", { name: "Drop every cell" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Drop every cell" }));
    await findCount(0);

    const link = document.createElement("a");
    link.href = "/admin/roles";
    link.textContent = "Roles";
    document.body.appendChild(link);
    fireEvent.click(link);
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Leave without saving?")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Leave without saving" }));
    expect(mockPush).toHaveBeenCalledWith("/admin/roles");
    link.remove();
  });

  it("switches region from the dropdown under the region name and asks first when there are unsaved changes", async () => {
    const props = renderEditor();
    await findCount(startingCodes.length);
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveTextContent("United Arab Emirates");

    fireEvent.click(screen.getByRole("button", { name: "Switch region: Dubai" }));
    expect(await screen.findByRole("heading", { name: "Regions in United Arab Emirates 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dubai DU-01" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Inactive", { selector: "button > span" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sharjah SH-01" }));
    expect(props.onSwitchRegion).toHaveBeenCalledWith(5);
    await waitFor(() => expect(screen.queryByRole("heading", { name: /Regions in/ })).not.toBeInTheDocument());

    fireEvent.click(within(cellsSection()).getByRole("button", { name: "Drop every cell" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Drop every cell" }));
    await findCount(0);
    fireEvent.click(screen.getByRole("button", { name: "Switch region: Dubai" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sharjah SH-01" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
    expect(props.onSwitchRegion).toHaveBeenCalledTimes(1);
  });

  it("keeps the selection options in a collapsible section at the bottom of the panel", async () => {
    renderEditor();
    await findCount(startingCodes.length);
    const sections = screen.getAllByRole("button", { expanded: true }).concat(screen.getAllByRole("button", { expanded: false }));
    const titles = sections.map((button) => button.textContent ?? "");
    expect(titles.some((title) => title.startsWith("Selection"))).toBe(true);
    const order = screen
      .getAllByRole("button")
      .map((button) => button.textContent ?? "")
      .filter((title) => /^(Centre|Map|Selection|Keyboard shortcuts)/.test(title))
      .map((title) => title.match(/^(Centre|Map|Selection|Keyboard shortcuts)/)![0]);
    expect(order).toEqual(["Centre", "Map", "Selection", "Keyboard shortcuts"]);
    const trigger = (title: string) => screen.getAllByRole("button").find((button) => (button.textContent ?? "").startsWith(title))!;
    expect(trigger("Centre")).toHaveAttribute("aria-expanded", "true");
    expect(trigger("Map")).toHaveAttribute("aria-expanded", "true");
    expect(trigger("Keyboard shortcuts")).toHaveAttribute("aria-expanded", "false");
    const selectionTrigger = sections.find((button) => (button.textContent ?? "").startsWith("Selection"))!;
    expect(selectionTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("radio", { name: "Add only" })).toBeInTheDocument();
    fireEvent.click(selectionTrigger);
    await waitFor(() => expect(selectionTrigger).toHaveAttribute("aria-expanded", "false"));
  });

  it("opens and closes the region details on small screens", async () => {
    renderEditor();
    await findCount(startingCodes.length);
    expect(screen.queryByRole("button", { name: /^(Hide|Show) panel$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    const body = document.getElementById("region-editor-panel-body")!;
    const toggle = screen.getByRole("button", { name: "Show region details" });
    expect(body).toHaveAttribute("inert");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(body).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Hide region details" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hide region details" }));
    expect(body).toHaveAttribute("inert");
  });

  it("is view only without permission", async () => {
    renderEditor({ canEdit: false });
    await findCount(startingCodes.length);
    expect(screen.getByText("View only. You don't have permission to change regions.")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "Rectangle" })) {
      expect(button).toHaveAttribute("aria-disabled", "true");
    }
    expect(within(cellsSection()).getByRole("button", { name: "Drop every cell" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Move to middle of cells" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("You don't have permission to do this.")).toBeInTheDocument();
  });

  it("asks before starting a new region while there are unsaved changes", async () => {
    const props = renderEditor();
    await findCount(startingCodes.length);
    fireEvent.click(within(cellsSection()).getByRole("button", { name: "Drop every cell" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Drop every cell" }));
    await findCount(0);
    fireEvent.click(screen.getByRole("button", { name: "Switch region: Dubai" }));
    fireEvent.click(await screen.findByRole("button", { name: "New region" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Start a new region?")).toBeInTheDocument();
    expect(props.picker.onCreateRegion).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(props.picker.onCreateRegion).toHaveBeenCalledTimes(1);
  });

  it("warns on the map when someone else saved and confirms before overwriting", async () => {
    const props = renderEditor({ conflict: true });
    await findCount(startingCodes.length);
    expect(screen.getAllByText(/Someone else saved this region/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Put at map centre" }));
    fireEvent.click(within(cellsSection()).getByRole("button", { name: "Save changes" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Replace their changes?")).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save anyway" }));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledTimes(1));
  });

  it("reloads straight away when there is nothing to lose", async () => {
    const props = renderEditor({ conflict: true });
    await findCount(startingCodes.length);
    fireEvent.click(screen.getByRole("button", { name: "Reload region" }));
    expect(props.onReload).toHaveBeenCalledTimes(1);
  });

  it("lets a centre moved to the middle of the cells be saved", async () => {
    renderEditor({ region: { id: 4, name: "Dubai", alternateName: null, code: "DU-01", active: true, centre: [55.0, 25.0], lastSavedAt: null } });
    await findCount(startingCodes.length);
    expect(screen.getByText("The centre is outside this region's cells.")).toBeInTheDocument();
    expect(within(cellsSection()).getByRole("button", { name: "Save changes" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "Move to middle of cells" }));
    await waitFor(() => expect(within(cellsSection()).getByRole("button", { name: "Save changes" })).not.toHaveAttribute("aria-disabled", "true"));
    expect(screen.queryByText("The centre is outside this region's cells.")).not.toBeInTheDocument();
  });

  it("ignores undo while a save is running so unsent edits stay unsaved", async () => {
    let finishSave: (saved: boolean) => void = () => undefined;
    const props = renderEditor({ onSave: jest.fn(() => new Promise<boolean>((resolve) => (finishSave = resolve))) });
    await findCount(startingCodes.length);
    fireEvent.click(within(cellsSection()).getByRole("button", { name: "Drop every cell" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Drop every cell" }));
    await findCount(0);
    fireEvent.keyDown(document.body, { code: "KeyZ", key: "z", ctrlKey: true });
    await findCount(startingCodes.length);
    fireEvent.click(screen.getByRole("button", { name: "Put at map centre" }));
    fireEvent.click(within(cellsSection()).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(document.body, { code: "KeyZ", key: "z", ctrlKey: true, shiftKey: true });
    expect(within(cellsSection()).getByText(`${startingCodes.length} cells`)).toBeInTheDocument();
    await act(async () => finishSave(true));
    await waitFor(() => expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument());
  });

  it("leaves Enter to a focused button while a polygon is being drawn", async () => {
    renderEditor();
    await findCount(startingCodes.length);
    fireEvent.click(screen.getAllByRole("button", { name: "Polygon" })[0]);
    const canvas = mockController.canvas;
    for (const [x, y] of [
      [100, 100],
      [400, 100],
      [400, 400],
    ]) {
      act(() => {
        canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: x, clientY: y, button: 0, bubbles: true }));
        canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: x, clientY: y, button: 0, bubbles: true }));
      });
    }
    expect(await screen.findByText("3 corners")).toBeInTheDocument();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    cancel.focus();
    fireEvent.keyDown(cancel, { key: "Enter", code: "Enter" });
    expect(screen.getByText("3 corners")).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(screen.queryByText("3 corners")).not.toBeInTheDocument());
  });
});
