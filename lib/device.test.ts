import { deviceLabelFromUA } from "./device";

describe("deviceLabelFromUA", () => {
  it("labels Windows Firefox", () => {
    expect(
      deviceLabelFromUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0"),
    ).toBe("Firefox · Windows");
  });

  it("labels Android Chrome", () => {
    expect(
      deviceLabelFromUA(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome · Android");
  });

  it("labels macOS Safari", () => {
    expect(
      deviceLabelFromUA(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      ),
    ).toBe("Safari · macOS");
  });

  it("labels Windows Edge", () => {
    expect(
      deviceLabelFromUA(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0",
      ),
    ).toBe("Edge · Windows");
  });

  it("falls back to Linux and generic Browser", () => {
    expect(deviceLabelFromUA("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36")).toBe(
      "Chrome · Linux",
    );
    expect(deviceLabelFromUA("some unknown agent")).toBe("Browser · Linux");
  });

  it("labels an iPhone user agent that omits Mac", () => {
    expect(deviceLabelFromUA("Mozilla/5.0 (iPhone) AppleWebKit Safari")).toBe("Safari · iOS");
  });
});
