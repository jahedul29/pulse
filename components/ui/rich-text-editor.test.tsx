import { render, screen } from "@testing-library/react";
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
});
