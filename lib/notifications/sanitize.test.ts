import { cleanTemplateBodyHtml, isTemplateHtml, sanitizeTemplateHtml } from "./sanitize";

describe("sanitizeTemplateHtml", () => {
  it("keeps allowed formatting tags", () => {
    const out = sanitizeTemplateHtml("<p>Hi <strong>bold</strong> <em>italic</em></p>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
  });

  it("keeps the backend's highlight spans and action links", () => {
    const html =
      '<p>Click <span class="highlight">here</span> to <a class="highlight" data-action="verify_email">verify</a></p>';
    expect(sanitizeTemplateHtml(html)).toBe(html);
  });

  it("strips <script> and event-handler XSS", () => {
    const out = sanitizeTemplateHtml('<p>x</p><script>alert(1)</script><img src=x onerror="alert(1)">');
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/<img/i);
    expect(out).toContain("<p>x</p>");
  });

  it("drops href and javascript: URLs from links", () => {
    const out = sanitizeTemplateHtml('<a href="javascript:alert(1)" data-action="verify_email">click</a>');
    expect(out).not.toMatch(/href|javascript:/i);
    expect(out).toContain('data-action="verify_email"');
    expect(out).toContain("click");
  });

  it("keeps only the highlight class, a plain action key and text alignment", () => {
    const out = sanitizeTemplateHtml(
      '<p style="position:fixed;inset:0"><span class="fixed inset-0">a</span><a class="highlight" data-action="x&quot; onclick" data-other="1">b</a></p><p style="text-align: center">c</p>',
    );
    expect(out).not.toMatch(/position|fixed|inset|data-other|onclick/);
    expect(out).toContain('<p style="text-align: center">c</p>');
  });

  it("leaves the shared DOMPurify instance without the template hook afterwards", () => {
    sanitizeTemplateHtml('<span class="highlight">a</span>');
    expect(sanitizeTemplateHtml('<span class="other">b</span>')).toBe("<span>b</span>");
  });
});

describe("isTemplateHtml", () => {
  it("tells HTML bodies from plain text", () => {
    expect(isTemplateHtml("<p>Hello</p>")).toBe(true);
    expect(isTemplateHtml('Tap <a class="highlight" data-action="verify_email">here</a>')).toBe(true);
    expect(isTemplateHtml("Your code is 1 < 2 and 3 > 2")).toBe(false);
    expect(isTemplateHtml("Plain text body.")).toBe(false);
  });
});

describe("sanitizeTemplateHtml actions", () => {
  it("drops an action that is not one of the known app actions", () => {
    const out = sanitizeTemplateHtml('<a class="highlight" data-action="delete_account">x</a>');
    expect(out).not.toContain("data-action");
    expect(out).toContain("x");
  });
});

describe("cleanTemplateBodyHtml", () => {
  it("unwraps anything the app does not render and keeps the text", () => {
    expect(cleanTemplateBodyHtml('<p><img src=x onerror="alert(1)"><b>Hi</b> <span class="other">there</span></p><div>end</div>')).toBe(
      "<p>Hi there</p>end",
    );
  });
});
