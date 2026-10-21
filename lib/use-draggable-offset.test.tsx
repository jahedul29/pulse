import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { useDraggableOffset, type DragOffset } from "./use-draggable-offset";

function Draggable({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const { dragging, handlers } = useDraggableOffset(ref, offset, setOffset);
  return (
    <button ref={ref} type="button" data-dragging={dragging || undefined} data-offset={`${offset.x},${offset.y}`} onClick={onClick} {...handlers}>
      Gear
    </button>
  );
}

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 900, top: 700, right: 948, bottom: 748, width: 48, height: 48, x: 900, y: 700, toJSON: () => ({}) });
});

afterEach(() => jest.restoreAllMocks());

it("moves on drag, keeps inside the viewport and does not count the drag as a click", () => {
  const onClick = jest.fn();
  render(<Draggable onClick={onClick} />);
  const gear = screen.getByRole("button", { name: "Gear" });
  fireEvent.pointerDown(gear, { pointerId: 1, button: 0, clientX: 920, clientY: 720 });
  fireEvent.pointerMove(gear, { pointerId: 1, clientX: 820, clientY: 640 });
  expect(gear).toHaveAttribute("data-dragging", "true");
  expect(gear).toHaveAttribute("data-offset", "-100,-80");
  fireEvent.pointerMove(gear, { pointerId: 1, clientX: 1200, clientY: 1000 });
  expect(gear).toHaveAttribute("data-offset", "44,44");
  fireEvent.pointerUp(gear, { pointerId: 1, clientX: 1200, clientY: 1000 });
  fireEvent.click(gear);
  expect(onClick).not.toHaveBeenCalled();
  expect(gear).not.toHaveAttribute("data-dragging");
});

it("treats a press without movement as a click", () => {
  const onClick = jest.fn();
  render(<Draggable onClick={onClick} />);
  const gear = screen.getByRole("button", { name: "Gear" });
  fireEvent.pointerDown(gear, { pointerId: 1, button: 0, clientX: 920, clientY: 720 });
  fireEvent.pointerMove(gear, { pointerId: 1, clientX: 922, clientY: 721 });
  fireEvent.pointerUp(gear, { pointerId: 1, clientX: 922, clientY: 721 });
  fireEvent.click(gear);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(gear).toHaveAttribute("data-offset", "0,0");
});
