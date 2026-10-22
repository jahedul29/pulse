import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { DetailList } from "./detail-list";
import { DetailSection } from "./detail-section";
import { FieldsJsonPanel } from "./fields-json-panel";
import { HashValue, shortHash } from "./hash-value";
import { SummaryStrip } from "./summary-strip";

jest.mock("next-intl", () => {
  const { translate } = jest.requireActual("../locations/test-intl");
  return {
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
      translate(mockMessages, `${ns}.${key}`, values),
  };
});

describe("SummaryStrip", () => {
  it("lists each label with its value in one row", () => {
    render(
      <SummaryStrip
        items={[
          { label: "Created at", value: "22-Oct-2026 14:27" },
          { label: "Result", value: "Failure" },
          { label: "Importance", value: "Critical" },
        ]}
      />,
    );
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(["Created at", "Result", "Importance"]);
    expect(screen.getByText("Created at").nextElementSibling).toHaveTextContent("22-Oct-2026 14:27");
  });
});

describe("DetailSection", () => {
  it("puts a heading over its content", () => {
    render(
      <DetailSection title="Target">
        <p>Body</p>
      </DetailSection>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Target" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

describe("DetailList divided", () => {
  it("keeps each label next to its value", () => {
    render(<DetailList divided items={[{ label: "Service", value: "Content" }]} />);
    expect(screen.getByText("Service").nextElementSibling).toHaveTextContent("Content");
  });
});

describe("FieldsJsonPanel", () => {
  it("shows the fields first and switches to JSON", async () => {
    render(<FieldsJsonPanel title="Request details" fields={<p>Reason: Audit</p>} json={'{ "reason": "Audit" }'} copyJson={() => ""} />);
    expect(screen.getByText("Reason: Audit")).toBeVisible();
    await userEvent.click(screen.getByRole("tab", { name: "JSON" }));
    expect(screen.getByText('{ "reason": "Audit" }')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy as JSON" })).toBeInTheDocument();
  });
});

describe("HashValue", () => {
  it("shortens long values in the middle and keeps the full value on hover", () => {
    const hash = "0a296cf7c7941a4ee1a7e763e3f9b04800a5485d2df662dc367f113856019219";
    expect(shortHash(hash)).toBe("0a296cf7c794…56019219");
    render(<HashValue value={hash} short />);
    expect(screen.getByText("0a296cf7c794…56019219")).toHaveAttribute("title", hash);
    expect(within(screen.getByText("0a296cf7c794…56019219").parentElement as HTMLElement).getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("leaves short values whole", () => {
    expect(shortHash("corr-1")).toBe("corr-1");
  });

  it("names its copy button after the field, so several hashes can be told apart", () => {
    render(<HashValue value={"a".repeat(64)} label="Row hash" />);
    expect(screen.getByRole("button", { name: "Copy Row hash" })).toBeInTheDocument();
  });
});
