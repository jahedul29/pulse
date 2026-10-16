import { fireEvent, render, screen } from "@testing-library/react";
import mockMessages from "../../../messages/en.json";
import { PolygonBar, ToolDock } from "./tool-dock";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, unknown>;
  const resolve = (path: string): unknown =>
    path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
  return {
    useLocale: () => "en",
    useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
      const value = resolve(`${namespace}.${key}`);
      let text = typeof value === "string" ? value : key;
      if (key === "polygonCorners") text = `${values?.formatted} corners`;
      for (const [name, replacement] of Object.entries(values ?? {})) text = text.replace(`{${name}}`, String(replacement));
      return text;
    },
  };
});

describe("ToolDock", () => {
  it("keeps every tool icon-only so the dock never changes size, and switches tools", () => {
    const onToolChange = jest.fn();
    render(<ToolDock tool="rectangle" onToolChange={onToolChange} />);
    const rectangle = screen.getByRole("button", { name: "Rectangle" });
    expect(rectangle).toHaveAttribute("aria-pressed", "true");
    expect(rectangle).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Pan" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Drag a box across the grid. Hold Shift to only add, Alt to only remove.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ellipse" }));
    expect(onToolChange).toHaveBeenLastCalledWith("ellipse");
  });

  it("returns to Pan when the active painting tool is pressed again", () => {
    const onToolChange = jest.fn();
    render(<ToolDock tool="polygon" onToolChange={onToolChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Polygon" }));
    expect(onToolChange).toHaveBeenLastCalledWith("pan");
  });

  it("keeps painting tools focusable but disabled when editing is not allowed", () => {
    const onToolChange = jest.fn();
    render(<ToolDock tool="pan" onToolChange={onToolChange} disabledReason="No permission" />);
    const paint = screen.getByRole("button", { name: "Paint cells" });
    expect(paint).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(paint);
    expect(onToolChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pan" })).not.toHaveAttribute("aria-disabled", "true");
  });

  it("moves focus between tools with the arrow keys", () => {
    render(<ToolDock tool="pan" onToolChange={jest.fn()} />);
    const pan = screen.getByRole("button", { name: "Pan" });
    pan.focus();
    fireEvent.keyDown(pan, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Paint cells" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(pan).toHaveFocus();
  });
});

describe("PolygonBar", () => {
  it("counts corners and only lets the polygon finish with at least three", () => {
    const onFinish = jest.fn();
    const { rerender } = render(<PolygonBar finishDisabled={false} corners={2} onFinish={onFinish} onUndoPoint={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText("2 corners")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish" })).toBeDisabled();
    rerender(<PolygonBar finishDisabled={false} corners={3} onFinish={onFinish} onUndoPoint={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalled();
  });
});
