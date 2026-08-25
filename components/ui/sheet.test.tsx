import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "./sheet";
import { Button } from "./button";

function Harness({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Record detail</SheetTitle>
        </SheetHeader>
        <SheetBody>Body content</SheetBody>
        <SheetFooter>
          <Button>Primary action</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("renders an open dialog with title, body and footer action", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Record detail")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Primary action" })).toBeInTheDocument();
  });

  it("closes via the close button", async () => {
    const onOpenChange = jest.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalled();
    expect(onOpenChange.mock.calls[0][0]).toBe(false);
  });
});
