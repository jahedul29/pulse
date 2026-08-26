import { sanitizeTemplateHtml } from "./sanitize";

describe("sanitizeTemplateHtml", () => {
  it("keeps allowed formatting tags", () => {
    const out = sanitizeTemplateHtml("<p>Hi <strong>bold</strong> <em>italic</em></p>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
  });

  it("strips <script> and event-handler XSS", () => {
    const out = sanitizeTemplateHtml(
      '<p>x</p><script>alert(1)</script><img src=x onerror="alert(1)">',
    );
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/<img/i);
    expect(out).toContain("<p>x</p>");
  });

  it("drops anchors and javascript: URLs (link disabled)", () => {
    const out = sanitizeTemplateHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toMatch(/<a[\s>]/i);
    expect(out).not.toMatch(/javascript:/i);
    expect(out).toContain("click");
  });
});
