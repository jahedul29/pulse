import { MERGE_VARIABLES, htmlToPlainText, plainTextToHtml, renderTemplate } from "./variables";

describe("renderTemplate", () => {
  it("replaces {first_name} with the English sample", () => {
    expect(renderTemplate("<p>Hello {first_name},</p>", "en")).toBe("<p>Hello Layla,</p>");
  });

  it("uses the Arabic sample under the ar locale", () => {
    expect(renderTemplate("مرحباً {first_name}،", "ar")).toBe("مرحباً ليلى،");
  });

  it("offers only the backend's first_name variable", () => {
    expect(MERGE_VARIABLES.map((variable) => variable.token)).toEqual(["first_name"]);
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
    expect(htmlToPlainText("<p>Hi {first_name}</p>")).toBe("Hi {first_name}");
  });
});

describe("plainTextToHtml", () => {
  it("turns each line into an escaped paragraph", () => {
    expect(plainTextToHtml("Hello <b>\n\nSecond line")).toBe("<p>Hello &lt;b&gt;</p><p>Second line</p>");
    expect(plainTextToHtml("  ")).toBe("");
  });
});
