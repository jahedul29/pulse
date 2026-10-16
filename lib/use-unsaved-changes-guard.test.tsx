import { fireEvent, render, screen } from "@testing-library/react";
import { runGuarded, useUnsavedChangesGuard, type BlockedTarget } from "./use-unsaved-changes-guard";

function Harness({ dirty, onBlocked }: { dirty: boolean; onBlocked: (target: BlockedTarget) => void }) {
  useUnsavedChangesGuard(dirty, onBlocked);
  return (
    <div>
      <a href="/reports/monthly" onClick={mockLinkClick}>
        Roles
      </a>
      <a href="/reports/monthly" target="_blank">Roles in a new tab</a>
      <a href="https://example.com/">Elsewhere</a>
      <a href={window.location.pathname}>Same page</a>
      <a href="/.//evil.example/path">Protocol relative</a>
    </div>
  );
}

const mockLinkClick = jest.fn();

beforeEach(() => mockLinkClick.mockClear());

describe("useUnsavedChangesGuard", () => {
  it("stops in-app links while there are unsaved changes and reports where they went", () => {
    const onBlocked = jest.fn();
    render(<Harness dirty onBlocked={onBlocked} />);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    screen.getByText("Roles").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onBlocked).toHaveBeenCalledWith("/reports/monthly");
  });

  it("lets new-tab, modified, external and same-page clicks through", () => {
    const onBlocked = jest.fn();
    render(<Harness dirty onBlocked={onBlocked} />);
    fireEvent.click(screen.getByText("Roles in a new tab"));
    fireEvent.click(screen.getByText("Roles"), { ctrlKey: true });
    fireEvent.click(screen.getByText("Elsewhere"));
    fireEvent.click(screen.getByText("Same page"));
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("never hands back a path the router would treat as another site", () => {
    const onBlocked = jest.fn();
    render(<Harness dirty onBlocked={onBlocked} />);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    screen.getByText("Protocol relative").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("does nothing without unsaved changes", () => {
    const onBlocked = jest.fn();
    render(<Harness dirty={false} onBlocked={onBlocked} />);
    fireEvent.click(screen.getByText("Roles"));
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("asks the browser to confirm leaving the page while dirty", () => {
    render(<Harness dirty onBlocked={jest.fn()} />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("still runs the link's own click handler while holding the navigation", () => {
    const onBlocked = jest.fn();
    render(<Harness dirty onBlocked={onBlocked} />);
    fireEvent.click(screen.getByText("Roles"));
    expect(onBlocked).toHaveBeenCalledWith("/reports/monthly");
    expect(mockLinkClick).toHaveBeenCalledTimes(1);
    expect(mockLinkClick.mock.calls[0][0].defaultPrevented).toBe(true);
  });

  it("routes guarded actions through the dialog only while there are unsaved changes", () => {
    const onBlocked = jest.fn();
    const proceed = jest.fn();
    const { rerender } = render(<Harness dirty onBlocked={onBlocked} />);
    runGuarded(proceed);
    expect(proceed).not.toHaveBeenCalled();
    expect(onBlocked).toHaveBeenCalledWith(proceed);
    rerender(<Harness dirty={false} onBlocked={onBlocked} />);
    runGuarded(proceed);
    expect(proceed).toHaveBeenCalledTimes(1);
  });
});
