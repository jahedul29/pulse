import "@testing-library/jest-dom";

process.env.NEXT_PUBLIC_API_BASE_URL ||= "https://api.test.local";

if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!window.PointerEvent) {
    class PointerEventPolyfill extends MouseEvent {
      readonly pointerId: number;
      readonly pointerType: string;
      readonly isPrimary: boolean;

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
        this.pointerType = init.pointerType ?? "mouse";
        this.isPrimary = init.isPrimary ?? true;
      }
    }
    window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
  }
}
