import { fireEvent, render } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { RecordPager as RecordPagerState } from "@/lib/use-record-pager";
import { RecordPager } from "./record-pager";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

function renderPager() {
  const step = jest.fn();
  const pager: RecordPagerState = { position: 2, total: 5, canPrev: true, canNext: true, pending: null, step };
  const view = render(
    <TooltipProvider>
      <div role="dialog">
        <RecordPager pager={pager} />
        <button type="button">In the drawer</button>
      </div>
      <div role="alertdialog">
        <button type="button">Confirm</button>
      </div>
      <button type="button" role="combobox" aria-expanded="false" aria-controls="picker-list">
        Pick
      </button>
    </TooltipProvider>,
  );
  return { step, view };
}

describe("RecordPager shortcut", () => {
  it("pages with Alt+arrow from the page or the drawer itself", () => {
    const { step, view } = renderPager();
    fireEvent.keyDown(document.body, { key: "ArrowDown", altKey: true });
    fireEvent.keyDown(view.getByText("In the drawer"), { key: "ArrowUp", altKey: true });
    expect(step.mock.calls).toEqual([[1], [-1]]);
  });

  it("leaves other dialogs and dropdown triggers alone", () => {
    const { step, view } = renderPager();
    fireEvent.keyDown(view.getByText("Confirm"), { key: "ArrowDown", altKey: true });
    fireEvent.keyDown(view.getByText("Pick"), { key: "ArrowDown", altKey: true });
    expect(step).not.toHaveBeenCalled();
  });
});

describe("RecordPager layout", () => {
  it("puts both arrows side by side, styled alike, with the position after them", () => {
    const { view } = renderPager();
    const group = view.getByRole("group");
    const children = Array.from(group.children);
    expect(children.map((child) => child.tagName)).toEqual(["BUTTON", "BUTTON", "SPAN"]);
    expect(children[0].className).toBe(children[1].className);
    expect(children[2]).toHaveTextContent("recordPosition");
  });
});
