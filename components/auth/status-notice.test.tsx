import { render, screen } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import { StatusNotice } from "./status-notice";

jest.mock("next-intl", () => {
  const { translate } = jest.requireActual("../locations/test-intl");
  return {
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
      translate(mockMessages, `${ns}.${key}`, values),
  };
});

function renderNotice(support: boolean) {
  render(<StatusNotice icon={null} title="Account locked" body="Try again later." onBack={jest.fn()} support={support} />);
}

describe("StatusNotice", () => {
  it("links the support contact to the support mailbox", () => {
    renderNotice(true);
    expect(screen.getByRole("link", { name: "Contact IT support" })).toHaveAttribute(
      "href",
      "mailto:abapro.ai@gmail.com",
    );
  });

  it("hides the support contact when not requested", () => {
    renderNotice(false);
    expect(screen.queryByRole("link", { name: "Contact IT support" })).not.toBeInTheDocument();
  });
});
