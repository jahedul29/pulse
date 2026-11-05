import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TEMPLATE_ACTION, TEMPLATE_BODY_MARKS, TEMPLATE_HIGHLIGHT } from "./template-editor-marks";

function editorWith(content: string) {
  return new Editor({ extensions: [StarterKit.configure({ link: false }), ...TEMPLATE_BODY_MARKS], content });
}

describe("template body marks", () => {
  it("keeps the backend's highlight spans and action links unchanged when loaded", () => {
    const html =
      '<p>Please enter your email and then click <a class="highlight" data-action="verify_email">verify</a> again</p><p>Read the <span class="highlight">Terms of Service</span></p>';
    const editor = editorWith(html);
    expect(editor.getHTML()).toBe(html);
    editor.destroy();
  });

  it("drops an action link whose action the app does not know, keeping its text", () => {
    const editor = editorWith('<p>Tap <a class="highlight" data-action="delete_account">here</a></p>');
    expect(editor.getHTML()).toBe("<p>Tap here</p>");
    editor.destroy();
  });

  it("adds a highlight and an action link to the selected text", () => {
    const editor = editorWith("<p>Open status now</p>");
    editor.chain().setTextSelection({ from: 1, to: 5 }).toggleMark(TEMPLATE_HIGHLIGHT).run();
    editor.chain().setTextSelection({ from: 6, to: 12 }).setMark(TEMPLATE_ACTION, { action: "open_account_status" }).run();
    expect(editor.getHTML()).toBe(
      '<p><span class="highlight">Open</span> <a class="highlight" data-action="open_account_status">status</a> now</p>',
    );
    editor.destroy();
  });
});
