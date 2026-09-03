import { MERGE_VARIABLES, htmlToPlainText, renderTemplate } from "./variables";

describe("renderTemplate", () => {
  it("replaces known tokens with the English sample", () => {
    expect(renderTemplate("Hi {clientName}, code {code}.", "en")).toBe(
      "Hi Layla Haddad, code 482913.",
    );
  });

  it("uses the Arabic sample under the ar locale", () => {
    expect(renderTemplate("{clientName}", "ar")).toBe("ليلى حداد");
  });

  it("leaves unknown tokens untouched", () => {
    expect(renderTemplate("Hello {unknownToken}", "en")).toBe("Hello {unknownToken}");
  });

  it("returns plain text unchanged", () => {
    expect(renderTemplate("No variables here", "en")).toBe("No variables here");
  });

  it("every variable has both locale samples", () => {
    for (const variable of MERGE_VARIABLES) {
      expect(variable.sampleEn.length).toBeGreaterThan(0);
      expect(variable.sampleAr.length).toBeGreaterThan(0);
    }
  });
});

describe("htmlToPlainText", () => {
  it("strips tags and keeps text", () => {
    expect(htmlToPlainText("<p>Hello <strong>there</strong></p>")).toBe("Hello there");
  });

  it("turns paragraph and break boundaries into newlines", () => {
    expect(htmlToPlainText("<p>One</p><p>Two</p>")).toBe("One\nTwo");
    expect(htmlToPlainText("Line<br>Break")).toBe("Line\nBreak");
  });

  it("decodes common entities", () => {
    expect(htmlToPlainText("<p>Tom &amp; Jerry</p>")).toBe("Tom & Jerry");
  });

  it("preserves merge tokens for later substitution", () => {
    expect(htmlToPlainText("<p>Hi {clientName}</p>")).toBe("Hi {clientName}");
  });
});
