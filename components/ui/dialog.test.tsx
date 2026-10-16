import { render, screen } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  return {
    useTranslations: (ns: string) => (key: string) => {
      const value = messages[ns]?.[key];
      return typeof value === "string" ? value : key;
    },
  };
});

describe("Dialog inside a drawer", () => {
  it("dims the drawer behind it with its own backdrop", async () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>User details</SheetTitle>
          <Dialog open>
            <DialogContent>
              <DialogTitle>Add a direct permission</DialogTitle>
            </DialogContent>
          </Dialog>
        </SheetContent>
      </Sheet>,
    );
    expect(await screen.findByRole("dialog", { name: "Add a direct permission" })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="dialog-overlay"]')).toHaveLength(1);
  });
});
