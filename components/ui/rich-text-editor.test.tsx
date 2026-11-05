import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/react";
import { RichTextEditor } from "./rich-text-editor";

describe("RichTextEditor", () => {
  it("renders the formatting toolbar with labelled controls", async () => {
    render(<RichTextEditor value="<p>Hello</p>" onChange={() => {}} ariaLabel="Body" />);

    expect(await screen.findByLabelText("Bold")).toBeInTheDocument();
    expect(screen.getByLabelText("Italic")).toBeInTheDocument();
    expect(screen.getByLabelText("Align left")).toBeInTheDocument();
    expect(screen.getByLabelText("Align center")).toBeInTheDocument();
    expect(screen.getByLabelText("Align right")).toBeInTheDocument();
  });

  it("can hide the basic tools and show only the caller's tools", async () => {
    render(
      <RichTextEditor
        value="<p>Hello</p>"
        onChange={() => {}}
        ariaLabel="Body"
        basicTools={false}
        extraTools={() => <button type="button">Custom tool</button>}
      />,
    );

    expect(await screen.findByRole("button", { name: "Custom tool" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Bold")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Align left")).not.toBeInTheDocument();
  });

  it("names every icon button in a tooltip", async () => {
    render(<RichTextEditor value="<p>Hello</p>" onChange={() => {}} ariaLabel="Body" />);

    await userEvent.hover(await screen.findByLabelText("Bold"));
    expect(await screen.findByText("Bold", { selector: "[data-slot=tooltip-content]" }, { timeout: 2000 })).toBeInTheDocument();
  });

  it("does not keep bold, italic, underline or alignment when the basic tools are off", async () => {
    let current: Editor | null = null;
    render(
      <RichTextEditor
        value='<p style="text-align: center"><strong>Bold</strong> <em>it</em> <u>u</u></p>'
        onChange={() => {}}
        ariaLabel="Body"
        basicTools={false}
        extraTools={(editor) => {
          current = editor;
          return null;
        }}
      />,
    );
    await screen.findByLabelText("Body");
    expect((current as unknown as Editor).getHTML()).toBe("<p>Bold it u</p>");
  });
});
