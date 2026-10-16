const ATTRIBUTION_SELECTOR = ".maplibregl-ctrl-attrib";
const EXPANDED_CLASS = "maplibregl-compact-show";

interface AttributionHost {
  getContainer: () => HTMLElement;
  on: (type: "styledata" | "sourcedata", listener: () => void) => unknown;
}

export function startAttributionCollapsed(map: AttributionHost): void {
  let openedByUser = false;
  const attribution = () => map.getContainer().querySelector<HTMLElement>(ATTRIBUTION_SELECTOR);
  attribution()?.addEventListener("click", () => {
    openedByUser = true;
  });
  const collapse = () => {
    if (!openedByUser) attribution()?.classList.remove(EXPANDED_CLASS);
  };
  collapse();
  map.on("styledata", collapse);
  map.on("sourcedata", collapse);
}
