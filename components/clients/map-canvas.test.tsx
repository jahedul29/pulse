import { render } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import MapCanvas, { markerCollection } from "./map-canvas";

type Handler = (event?: unknown) => void;

const mockInstances: MockMap[] = [];

class MockMap {
  options: Record<string, unknown>;
  handlers = new Map<string, Handler>();
  sources = new Map<string, { data: unknown; setData: jest.Mock }>();
  layers: Record<string, unknown>[] = [];
  removed = false;
  touchZoomRotate = { disableRotation: jest.fn() };
  canvas = document.createElement("canvas");
  constructor(options: Record<string, unknown>) {
    this.options = options;
    mockInstances.push(this);
  }
  addControl = jest.fn();
  getContainer = () => document.createElement("div");
  getCanvas = () => this.canvas;
  on(type: string, layerOrHandler: string | Handler, handler?: Handler) {
    const key = typeof layerOrHandler === "string" ? `${type}:${layerOrHandler}` : type;
    this.handlers.set(key, handler ?? (layerOrHandler as Handler));
    return this;
  }
  addSource(id: string, source: { data: unknown }) {
    this.sources.set(id, { data: source.data, setData: jest.fn() });
  }
  getSource(id: string) {
    return this.sources.get(id);
  }
  addLayer(layer: Record<string, unknown>) {
    this.layers.push(layer);
  }
  remove() {
    this.removed = true;
  }
}

const mockPopup = { setLngLat: jest.fn(), setDOMContent: jest.fn(), addTo: jest.fn(), remove: jest.fn() };

jest.mock("maplibre-gl", () => ({
  Map: jest.fn().mockImplementation((options: Record<string, unknown>) => new MockMap(options)),
  NavigationControl: jest.fn(),
  Popup: jest.fn().mockImplementation(() => {
    mockPopup.setLngLat.mockReturnValue(mockPopup);
    mockPopup.setDOMContent.mockReturnValue(mockPopup);
    return mockPopup;
  }),
  getVersion: () => "6.0.0",
  setWorkerUrl: jest.fn(),
}), { virtual: true });

jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) =>
    ((mockMessages as unknown as Record<string, Record<string, string>>)[ns]?.[key] ?? key),
}));

const markers = [
  { lat: 40.75, lng: -73.98, label: "Midtown", sub: "12 clients · 20%", radius: 14 },
  { lat: 40.7, lng: -74.01, label: "Financial District" },
];

beforeEach(() => {
  mockInstances.length = 0;
  jest.clearAllMocks();
});

describe("markerCollection", () => {
  it("turns markers into GeoJSON points in lng/lat order with a default radius", () => {
    const collection = markerCollection(markers);
    expect(collection.features[0].geometry.coordinates).toEqual([-73.98, 40.75]);
    expect(collection.features[0].properties).toEqual({ label: "Midtown", sub: "12 clients · 20%", radius: 14 });
    expect(collection.features[1].properties).toEqual({ label: "Financial District", sub: "", radius: 9 });
  });
});

describe("MapCanvas", () => {
  it("starts a MapLibre map at the given centre without scroll zoom, with translated controls", () => {
    render(<MapCanvas center={[40.74, -73.97]} zoom={11} markers={markers} />);
    const map = mockInstances[0];
    expect(map.options).toMatchObject({ center: [-73.97, 40.74], zoom: 11, scrollZoom: false });
    expect(map.options.locale).toMatchObject({ "Map.Title": "Clients map", "NavigationControl.ZoomIn": "Zoom in" });
  });

  it("draws the markers as a circle layer once the style loads and shows a popup on hover", () => {
    render(<MapCanvas center={[40.74, -73.97]} zoom={11} markers={markers} />);
    const map = mockInstances[0];
    map.handlers.get("load")?.();

    expect(map.sources.get("client-markers")?.data).toEqual(markerCollection(markers));
    expect(map.layers[0]).toMatchObject({ type: "circle", source: "client-markers" });

    map.handlers.get("mouseenter:client-markers")?.({
      features: [{ geometry: { type: "Point", coordinates: [-73.98, 40.75] }, properties: { label: "Midtown", sub: "12 clients · 20%" } }],
    });
    const content = mockPopup.setDOMContent.mock.calls[0][0] as HTMLElement;
    expect(content.textContent).toBe("Midtown12 clients · 20%");
    expect(map.canvas.style.cursor).toBe("pointer");

    map.handlers.get("mouseleave:client-markers")?.();
    expect(mockPopup.remove).toHaveBeenCalled();
  });

  it("removes the map on unmount", () => {
    const { unmount } = render(<MapCanvas center={[40.74, -73.97]} zoom={11} markers={markers} />);
    unmount();
    expect(mockInstances[0].removed).toBe(true);
  });
});
