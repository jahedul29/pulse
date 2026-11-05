import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/react";
import mockMessages from "../../messages/en.json";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TEMPLATE_BODY_MARKS } from "@/components/notifications/template-editor-marks";
import { TemplateBodyTools } from "./template-body-tools";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], messages[ns]);
  return {
    useTranslations: (ns: string) => (key: string) => {
      const value = resolve(ns, key);
      return typeof value === "string" ? value : key;
    },
  };
});

beforeAll(() => {
  Object.assign(Range.prototype, {
    getClientRects: () => [],
    getBoundingClientRect: () => new DOMRect(),
  });
});

const tooltip = (text: string) =>
  screen.findByText(text, { selector: "[data-slot=tooltip-content]" }, { timeout: 2000 });

function renderTools(onChange: (html: string) => void = () => {}) {
  let current: Editor | null = null;
  render(
    <RichTextEditor
      value="<p>Open status now</p>"
      onChange={onChange}
      ariaLabel="English copy"
      basicTools={false}
      extensions={TEMPLATE_BODY_MARKS}
      extraTools={(editor) => {
        current = editor;
        return <TemplateBodyTools editor={editor} />;
      }}
    />,
  );
  return () => current as unknown as Editor;
}

describe("TemplateBodyTools", () => {
  it("explains the highlight button in a tooltip", async () => {
    renderTools();

    await userEvent.hover(await screen.findByRole("button", { name: "Highlight" }));
    expect(await tooltip("Highlight: shows the selected text in purple")).toBeInTheDocument();
  });

  it("asks for a selection before an action link can be added", async () => {
    renderTools();

    const link = await screen.findByRole("button", { name: "Select text to add an action link" });
    await userEvent.hover(link);
    expect(await tooltip("Select text to add an action link")).toBeInTheDocument();
    await userEvent.click(link);
    expect(screen.queryByRole("button", { name: /Verify email/ })).not.toBeInTheDocument();
  });

  it("explains the action link and adds the picked action to the selected text", async () => {
    const onChange = jest.fn();
    const editor = renderTools(onChange);
    await screen.findByRole("button", { name: "Highlight" });
    act(() => {
      editor().commands.setTextSelection({ from: 6, to: 12 });
    });

    const link = await screen.findByRole("button", { name: "Action link" });
    await userEvent.hover(link);
    expect(await tooltip("Action link: tapping the selected text opens a screen or runs an action in the app")).toBeInTheDocument();
    expect(link).not.toHaveAttribute("aria-pressed");
    await userEvent.click(link);
    await userEvent.click(await screen.findByRole("button", { name: /Open account status/ }));

    expect(onChange).toHaveBeenLastCalledWith(
      '<p>Open <a class="highlight" data-action="open_account_status">status</a> now</p>',
    );
    await userEvent.click(await screen.findByRole("button", { name: "Action link" }));
    expect(await screen.findByRole("button", { name: /Open account status/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Verify email/ })).toHaveAttribute("aria-pressed", "false");
  });
});
