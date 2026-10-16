"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, Lock, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtCount, fmtList } from "@/lib/format";
import { codesBounds, createRingLookup, type GeoBounds, type LngLat } from "@/lib/mgrs/grid";
import type { ShapeRule } from "@/lib/region-builder/cells-in-shape";
import { isCentreInside, middleOfCells } from "@/lib/region-builder/centre";
import type { SelectionMode } from "@/lib/region-builder/modes";
import type { MapBackground } from "@/lib/region-builder/backgrounds";
import { createSelection, type CellChange } from "@/lib/region-builder/selection";
import type { EditorTool } from "@/lib/region-builder/tools";
import { useUiStore } from "@/lib/ui-store";
import { useRetained } from "@/lib/use-retained";
import { useMediaQuery } from "@/lib/use-media-query";
import { useUnsavedChangesGuard, type BlockedTarget } from "@/lib/use-unsaved-changes-guard";
import { cn } from "@/lib/utils";
import { FULL_BLEED_HEIGHT } from "../full-bleed";
import { createHoverStore, HoverSlot } from "./hover-slot";
import { MapControls } from "./map-controls";
import { NoticeSlot, type NoticeContent } from "./notice-slot";
import { CellsSection } from "./panel/cells-section";
import { CentreOptions, formatCentre } from "./panel/centre-options";
import { MapOptions } from "./panel/map-options";
import { PanelAccordion } from "./panel/panel-accordion";
import { PanelSection } from "./panel/panel-section";
import type { CountryOption } from "../use-country-options";
import type { NavigatorRegion } from "./panel/region-navigator";
import { RegionSummary } from "./panel/region-summary";
import { SelectionOptions } from "./panel/selection-options";
import { ShortcutsList } from "./panel/shortcuts-list";
import { StageState } from "./stage-state";
import { PolygonBar, ToolDock } from "./tool-dock";
import { useMapInteractions, type InteractionNotice } from "./use-map-interactions";
import { useRegionMap } from "./use-region-map";

const DEFAULT_VIEW = { center: [54.4, 24.3] as LngLat, zoom: 7 };
const EMPTY_REGION_ZOOM = 10;
const NOTICE_MS = 4000;
const GRID_NOTICE_ZOOM = 9;
const PANEL_INSET_PX = 384;
const DOCK_INSET_PX = 72;
const MOBILE_BOTTOM_INSET_PX = 150;
const DESKTOP_QUERY = "(min-width: 1024px)";

export interface RegionEditorRegion {
  id: number;
  name: string;
  alternateName: string | null;
  code: string | null;
  active: boolean;
  centre: LngLat | null;
  lastSavedAt: number | null;
}

export interface RegionEditorCoverage {
  status: "loading" | "error" | "ready";
  codes: string[] | null;
  onRetry: () => void;
}

export interface OtherRegion {
  id: number;
  name: string;
  codes: string[];
}

export interface RegionEditorPicker {
  countries: CountryOption[];
  countryId: number | null;
  onCountryChange: (id: number) => void;
  regions: NavigatorRegion[];
  onCreateRegion: () => void;
}

export interface RegionEditorProps {
  region: RegionEditorRegion;
  picker: RegionEditorPicker;
  coverage: RegionEditorCoverage;
  otherRegions: OtherRegion[];
  canEdit: boolean;
  conflict: boolean;
  onReload: () => void;
  onSave: (input: { codes: string[]; centre: LngLat }) => Promise<boolean>;
  onSwitchRegion: (id: number) => void;
  onEditDetails: () => void;
  onDeleteRegion: () => Promise<boolean>;
}

type PendingConfirm =
  | { kind: "dropAll"; count: number }
  | { kind: "revert" }
  | { kind: "delete" }
  | { kind: "overwrite" }
  | { kind: "create" }
  | { kind: "reload" }
  | { kind: "leave"; target: BlockedTarget }
  | { kind: "switch"; id: number };

const codeSets = new WeakMap<string[], Set<string>>();

function codeSet(codes: string[]): Set<string> {
  let set = codeSets.get(codes);
  if (!set) {
    set = new Set(codes);
    codeSets.set(codes, set);
  }
  return set;
}

const NOTICE_KEYS: Record<Exclude<InteractionNotice, null>, string> = {
  paintZoom: "paintNotice",
  tooLarge: "tooLarge",
  noCells: "noCellsInShape",
  shapeCancelled: "shapeCancelled",
  needThreeCorners: "polygonNeedsThree",
};

export function RegionEditor({
  region,
  picker,
  coverage,
  otherRegions,
  canEdit,
  conflict,
  onReload,
  onSave,
  onSwitchRegion,
  onEditDetails,
  onDeleteRegion,
}: RegionEditorProps) {
  const t = useTranslations("locations.editor");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const prefs = useUiStore((state) => state.regionEditor);
  const setPrefs = useUiStore((state) => state.setRegionEditor);
  const [rings] = useState(createRingLookup);
  const [selection] = useState(createSelection);
  const snapshot = useSyncExternalStore(selection.subscribe, selection.getSnapshot, selection.getSnapshot);

  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [initialView] = useState(() => (region.centre ? { center: region.centre, zoom: EMPTY_REGION_ZOOM } : DEFAULT_VIEW));
  const mapLabels = useMemo(
    () => ({
      "Map.Title": t("mapLabel"),
      "Marker.Title": t("centreMarker"),
      "AttributionControl.ToggleAttribution": t("toggleAttribution"),
      "AttributionControl.MapFeedback": t("mapFeedback"),
    }),
    [t],
  );
  const map = useRegionMap({ hostRef, initialView, background: prefs.background, rings, labels: mapLabels });
  const controller = map.controller;

  const [tool, setTool] = useState<EditorTool>("pan");
  const [mode, setMode] = useState<SelectionMode>("toggle");
  const [rule, setRule] = useState<ShapeRule>("centre");
  const [hoverStore] = useState(createHoverStore);
  const [corners, setCorners] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<InteractionNotice>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [live, setLive] = useState({ id: 0, text: "" });
  const [announcedStates, setAnnouncedStates] = useState({ conflict: false, fallback: false });
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const loadedRef = useRef<string[] | null>(null);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const insetsRef = useRef({ end: 0, bottom: MOBILE_BOTTOM_INSET_PX });

  useEffect(() => {
    insetsRef.current = {
      end: desktop && prefs.panelOpen ? PANEL_INSET_PX : 0,
      bottom: desktop ? DOCK_INSET_PX : MOBILE_BOTTOM_INSET_PX,
    };
  }, [desktop, prefs.panelOpen]);

  const fitTo = useCallback(
    (bounds: GeoBounds) => {
      controller?.fitBounds(bounds, insetsRef.current);
    },
    [controller],
  );

  const ready = Boolean(controller) && coverage.status === "ready" && snapshot.loaded;
  const editable = canEdit && ready && !saving;
  const appliedOthersRef = useRef<{ controller: unknown; lists: string[][] }>({ controller: null, lists: [] });

  useEffect(() => {
    if (!controller || coverage.status !== "ready" || !coverage.codes || loadedRef.current) return;
    const codes = coverage.codes;
    loadedRef.current = codes;
    const savedCentre = region.centre;
    const pickedCodes = new Set(codes);
    const centre = savedCentre ?? middleOfCells(codes, rings, (code) => pickedCodes.has(code));
    selection.load(codes, { point: centre, source: savedCentre ? "saved" : "auto" });
    controller.setPicked(codes);
    const bounds = codesBounds(codes, rings);
    if (bounds) fitTo(bounds);
    else if (savedCentre) fitTo({ west: savedCentre[0] - 0.05, south: savedCentre[1] - 0.05, east: savedCentre[0] + 0.05, north: savedCentre[1] + 0.05 });
  }, [controller, coverage.codes, coverage.status, fitTo, region.centre, rings, selection]);

  useEffect(() => {
    if (!controller) return;
    return controller.onViewChange(setZoom);
  }, [controller]);

  useEffect(() => {
    if (!controller) return;
    const lists = otherRegions.map((other) => other.codes);
    const applied = appliedOthersRef.current;
    const unchanged =
      applied.controller === controller &&
      applied.lists.length === lists.length &&
      lists.every((list, index) => list === applied.lists[index]);
    if (unchanged) return;
    appliedOthersRef.current = { controller, lists };
    controller.setOtherRegions(lists.flat());
  }, [controller, otherRegions]);

  useEffect(() => {
    controller?.setLayerVisibility({ grid: prefs.showGrid, others: prefs.showOtherRegions });
  }, [controller, prefs.showGrid, prefs.showOtherRegions]);

  useEffect(() => {
    if (!controller || !ready) return;
    controller.setCentre(snapshot.centre, { draggable: editable });
  }, [controller, ready, snapshot.centre, editable]);

  useEffect(() => {
    if (!controller) return;
    return controller.onCentreMoved((point) => selection.setCentre(point, "manual"));
  }, [controller, selection]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const announce = useCallback((text: string) => {
    if (text) setLive((previous) => ({ id: previous.id + 1, text }));
  }, []);

  if (conflict !== announcedStates.conflict || map.backgroundFellBack !== announcedStates.fallback) {
    setAnnouncedStates({ conflict, fallback: map.backgroundFellBack });
    if (conflict && !announcedStates.conflict) announce(t("conflict"));
    else if (map.backgroundFellBack && !announcedStates.fallback) announce(t("backgroundFallback"));
  }

  const showNotice = useCallback(
    (next: InteractionNotice) => {
      setNotice(next);
      if (next) announce(t(NOTICE_KEYS[next]));
    },
    [announce, t],
  );

  const showBusy = useCallback(
    (next: boolean) => {
      setBusy(next);
      if (next) announce(t("workingOut"));
    },
    [announce, t],
  );

  const inRegion = useCallback((code: string) => selection.has(code), [selection]);
  const alsoInFor = useCallback(
    (code: string) => otherRegions.filter((other) => codeSet(other.codes).has(code)).map((other) => other.name),
    [otherRegions],
  );

  const refreshAutoCentre = useCallback(() => {
    if (selection.getSnapshot().centreSource !== "auto") return;
    selection.setCentre(middleOfCells(selection.codes(), rings, (code) => selection.has(code)), "auto");
  }, [rings, selection]);

  const onCellsChanged = useCallback(
    (change: CellChange) => {
      refreshAutoCentre();
      const parts: string[] = [];
      if (change.added.length) parts.push(t("added", { count: fmtCount(change.added.length, locale) }));
      if (change.removed.length) parts.push(t("dropped", { count: fmtCount(change.removed.length, locale) }));
      announce(fmtList(parts, locale, "unit"));
    },
    [announce, locale, refreshAutoCentre, t],
  );

  const applyHistory = useCallback(
    (change: CellChange | null) => {
      if (!change) return;
      controller?.applyChange(change);
      onCellsChanged(change);
    },
    [controller, onCellsChanged],
  );

  const fit = useCallback(() => {
    const bounds = codesBounds(selection.codes(), rings);
    if (bounds) fitTo(bounds);
  }, [fitTo, rings, selection]);

  const performSave = useCallback(async () => {
    const current = selection.getSnapshot();
    if (!editable || !current.dirty || current.count === 0) return;
    const centre = current.centre ?? middleOfCells(selection.codes(), rings, (code) => selection.has(code));
    if (!centre) return;
    setSaving(true);
    try {
      const codes = selection.codes();
      const saved = await onSave({ codes, centre });
      if (saved) {
        selection.markSaved(codes, centre);
        toast.success(t("savedToast", { count: codes.length, formatted: fmtCount(codes.length, locale) }));
      }
    } finally {
      setSaving(false);
    }
  }, [editable, locale, onSave, rings, selection, t]);

  const save = useCallback(() => {
    const current = selection.getSnapshot();
    if (!editable || !current.dirty || current.count === 0) return;
    if (conflict) setConfirm({ kind: "overwrite" });
    else void performSave();
  }, [conflict, editable, performSave, selection]);

  const interactions = useMapInteractions({
    controller,
    scopeRef: rootRef,
    selection,
    tool,
    mode,
    rule,
    canEdit,
    enabled: ready && !saving,
    onToolChange: setTool,
    onHover: hoverStore.set,
    onChange: onCellsChanged,
    onPolygonCorners: setCorners,
    onNotice: showNotice,
    onBusy: showBusy,
    onUndo: () => applyHistory(selection.undo()),
    onRedo: () => applyHistory(selection.redo()),
    onSave: save,
    onFit: fit,
    onZoom: (delta) => controller?.zoomBy(delta),
  });

  const allowNavigation = useUnsavedChangesGuard(snapshot.dirty, (target) => setConfirm({ kind: "leave", target }));

  const requestSwitch = (id: number) => {
    if (id === region.id) return;
    if (snapshot.dirty) setConfirm({ kind: "switch", id });
    else onSwitchRegion(id);
  };

  const requestCreate = () => {
    if (snapshot.dirty) setConfirm({ kind: "create" });
    else picker.onCreateRegion();
  };

  const requestReload = () => {
    if (snapshot.dirty) setConfirm({ kind: "reload" });
    else onReload();
  };

  const deleteRegion = async () => {
    setDeleting(true);
    try {
      if (await onDeleteRegion()) setConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  const confirmAction = () => {
    if (!confirm) return;
    if (confirm.kind === "delete") {
      if (!deleting) void deleteRegion();
      return;
    }
    if (confirm.kind === "overwrite") void performSave();
    if (confirm.kind === "create") picker.onCreateRegion();
    if (confirm.kind === "reload") onReload();
    if (confirm.kind === "dropAll") applyHistory(selection.dropAll());
    if (confirm.kind === "revert") {
      applyHistory(selection.revert());
      toast.success(t("revertedToast"));
    }
    if (confirm.kind === "leave") {
      allowNavigation();
      if (typeof confirm.target === "string") router.push(confirm.target);
      else confirm.target();
    }
    if (confirm.kind === "switch") {
      allowNavigation();
      onSwitchRegion(confirm.id);
    }
    setConfirm(null);
  };

  const disabledReason = !canEdit ? tc("noPermission") : !ready ? t("loadingCells") : saving ? t("savingCells") : null;
  const showGridNotice = prefs.showGrid && zoom !== null && zoom < GRID_NOTICE_ZOOM;
  const inside = isCentreInside(snapshot.centre, (code) => selection.has(code));
  const panelOpen = prefs.panelOpen;
  const lockReason = disabledReason;
  const shiftWithPanel = panelOpen ? "lg:ltr:-translate-x-[24rem] lg:rtl:translate-x-[24rem]" : "";
  const centreWithPanel = panelOpen ? "lg:ltr:-translate-x-[12rem] lg:rtl:translate-x-[12rem]" : "";
  const slide = "transition-transform duration-300 ease-out motion-reduce:transition-none";

  const showCentre = useCallback(() => {
    const centre = selection.getSnapshot().centre;
    if (centre) fitTo({ west: centre[0] - 0.03, south: centre[1] - 0.03, east: centre[0] + 0.03, north: centre[1] + 0.03 });
  }, [fitTo, selection]);
  const moveCentreToMiddle = useCallback(
    () => selection.setCentre(middleOfCells(selection.codes(), rings, (code) => selection.has(code)), "auto"),
    [rings, selection],
  );
  const putCentreAtMapCentre = useCallback(() => {
    if (controller) selection.setCentre(controller.centre(), "manual");
  }, [controller, selection]);
  const changeBackground = useCallback((background: MapBackground) => setPrefs({ background }), [setPrefs]);
  const changeShowGrid = useCallback((showGrid: boolean) => setPrefs({ showGrid }), [setPrefs]);
  const changeShowOthers = useCallback((showOtherRegions: boolean) => setPrefs({ showOtherRegions }), [setPrefs]);

  const mapStatus = map.status;
  const retryMap = map.retry;
  const coverageStatus = coverage.status;
  const retryCoverage = coverage.onRetry;
  const stageMessage = useMemo(() => {
    if (mapStatus === "failed") return { messageKey: "mapFailed", onRetry: retryMap };
    if (coverageStatus === "error") return { messageKey: "cellsError", onRetry: retryCoverage };
    if (mapStatus === "starting" || coverageStatus === "loading" || !ready) return { messageKey: "loadingCells", loading: true };
    return null;
  }, [coverageStatus, mapStatus, ready, retryCoverage, retryMap]);

  const shownConfirm = useRetained(confirm);
  const confirmCopy = (() => {
    if (!shownConfirm) return null;
    if (shownConfirm.kind === "dropAll") {
      return {
        title: t("dropAllTitle"),
        body: t("dropAllBody", { count: shownConfirm.count, formatted: fmtCount(shownConfirm.count, locale), name: region.name }),
        action: t("dropAll"),
        cancel: tc("cancel"),
        danger: true,
      };
    }
    if (shownConfirm.kind === "revert") {
      return { title: t("revertTitle"), body: t("revertBody", { name: region.name }), action: t("revert"), cancel: tc("cancel"), danger: false };
    }
    if (shownConfirm.kind === "delete") {
      return { title: t("deleteTitle"), body: t("deleteBody", { name: region.name }), action: t("deleteRegion"), cancel: tc("cancel"), danger: true };
    }
    if (shownConfirm.kind === "overwrite") {
      return { title: t("overwriteTitle"), body: t("overwriteBody"), action: t("overwriteConfirm"), cancel: tc("cancel"), danger: true };
    }
    if (shownConfirm.kind === "create") {
      return { title: t("createTitle"), body: t("createBody", { name: region.name }), action: t("createConfirm"), cancel: t("leaveStay"), danger: true };
    }
    if (shownConfirm.kind === "reload") {
      return { title: t("reloadTitle"), body: t("leaveBody", { name: region.name }), action: t("reloadRegion"), cancel: t("leaveStay"), danger: true };
    }
    return { title: t("leaveTitle"), body: t("leaveBody", { name: region.name }), action: t("leaveConfirm"), cancel: t("leaveStay"), danger: true };
  })();

  const conflictNotice: NoticeContent | null = conflict
    ? {
        text: t("conflict"),
        tone: "warning",
        action: (
          <Button size="xs" variant="outline" className="shrink-0 rounded-full" onClick={requestReload}>
            {t("reloadRegion")}
          </Button>
        ),
      }
    : null;
  const transientNotice: NoticeContent | null = busy
    ? { text: t("workingOut") }
    : notice
      ? { text: t(NOTICE_KEYS[notice]), tone: "warning" }
      : showGridNotice
        ? { text: t("gridNotice") }
        : ready && snapshot.count === 0 && canEdit
          ? { text: t("emptyRegion") }
          : null;
  const fallbackNotice: NoticeContent | null = map.backgroundFellBack ? { text: t("backgroundFallback"), tone: "warning" } : null;
  const shownStage = useRetained(stageMessage);

  const panelTop = (
    <>
      {canEdit ? null : (
        <p className="flex items-start gap-2 border-b bg-muted/60 px-4 py-3 text-xs text-pretty text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("viewOnly")}
        </p>
      )}
      <RegionSummary
        name={region.name}
        alternateName={region.alternateName}
        code={region.code}
        active={region.active}
        regionId={region.id}
        countries={picker.countries}
        countryId={picker.countryId}
        onCountryChange={picker.onCountryChange}
        regions={picker.regions}
        onSelectRegion={requestSwitch}
        onCreateRegion={requestCreate}
        canEdit={canEdit}
        noPermissionLabel={tc("noPermission")}
        onEdit={onEditDetails}
        onDelete={() => setConfirm({ kind: "delete" })}
      />
    </>
  );

  const panelDetails = (
    <>
      <PanelSection className="gap-3">
        <CellsSection
          snapshot={snapshot}
          lastSavedAt={region.lastSavedAt}
          saving={saving}
          lockReason={lockReason}
          onSave={save}
          onRevert={() => setConfirm({ kind: "revert" })}
          onDropAll={() => setConfirm({ kind: "dropAll", count: selection.getSnapshot().count })}
          onUndo={() => applyHistory(selection.undo())}
          onRedo={() => applyHistory(selection.redo())}
        />
      </PanelSection>
      <PanelAccordion
        openItems={prefs.expandedSections}
        onOpenItemsChange={(expandedSections) => setPrefs({ expandedSections })}
        items={[
          {
            value: "centre",
            title: t("centreTitle"),
            summary: snapshot.centre ? formatCentre(snapshot.centre, locale) : t("centreNotSet"),
            content: (
              <CentreOptions
                centre={snapshot.centre}
                source={snapshot.centreSource}
                inside={inside}
                lockReason={lockReason}
                onShow={showCentre}
                onMiddle={moveCentreToMiddle}
                onMapCentre={putCentreAtMapCentre}
              />
            ),
          },
          {
            value: "map",
            title: t("mapTitle"),
            summary: t(`background_${prefs.background}`),
            content: (
              <MapOptions
                background={prefs.background}
                onBackgroundChange={changeBackground}
                showGrid={prefs.showGrid}
                onShowGridChange={changeShowGrid}
                showOthers={prefs.showOtherRegions}
                onShowOthersChange={changeShowOthers}
              />
            ),
          },
          {
            value: "selection",
            title: t("selectionTitle"),
            summary: t(`mode_${mode}`),
            content: (
              <SelectionOptions mode={mode} onModeChange={setMode} rule={rule} onRuleChange={setRule} lockReason={lockReason} />
            ),
          },
          { value: "shortcuts", title: t("shortcutsTitle"), content: <ShortcutsList /> },
        ]}
      />
    </>
  );

  return (
    <div
      ref={rootRef}
      data-full-bleed
      className={cn(
        "relative flex min-h-[28rem] flex-col overflow-hidden",
        FULL_BLEED_HEIGHT,
        "lg:[&_.maplibregl-ctrl-bottom-right]:transition-transform lg:[&_.maplibregl-ctrl-bottom-right]:duration-300 motion-reduce:[&_.maplibregl-ctrl-bottom-right]:transition-none",
        panelOpen && "lg:ltr:[&_.maplibregl-ctrl-bottom-right]:-translate-x-[24rem]",
      )}
    >
      <p className="sr-only" role="status" aria-live="polite">
        <span key={live.id}>{live.text}</span>
      </p>
      <section className="relative min-h-0 flex-1 bg-muted" data-no-os aria-label={region.name}>
        <div className="absolute inset-0 [&_.maplibregl-ctrl-attrib]:text-xs [&_.maplibregl-ctrl-attrib]:leading-5 [&_.maplibregl-ctrl-bottom-right]:bottom-[4.25rem]! lg:[&_.maplibregl-ctrl-bottom-right]:bottom-0!">
          <div ref={hostRef} className="size-full" dir="ltr" />
        </div>
        {shownStage ? (
          <StageState
            message={t(shownStage.messageKey)}
            loading={shownStage.loading}
            onRetry={shownStage.onRetry}
            hidden={stageMessage === null}
          />
        ) : null}

        <div className="pointer-events-none absolute start-3 bottom-[8.25rem] z-[5] lg:bottom-[5.5rem]">
          <HoverSlot store={hoverStore} inRegion={inRegion} alsoIn={alsoInFor} />
        </div>

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-2 z-[5] flex justify-start ps-2 pe-14 transition-[padding] duration-300 ease-out motion-reduce:transition-none lg:justify-center lg:ps-2",
            panelOpen ? "lg:pe-[28rem]" : "lg:pe-16",
          )}
        >
          <div className="flex min-w-0 max-w-full flex-col items-center">
            <NoticeSlot notice={conflictNotice} />
            <NoticeSlot notice={transientNotice} />
            <NoticeSlot notice={fallbackNotice} />
          </div>
        </div>

        <div className={cn("absolute end-3 top-3 z-[5]", slide, shiftWithPanel)}>
          <MapControls
            onZoomIn={() => controller?.zoomBy(1)}
            onZoomOut={() => controller?.zoomBy(-1)}
            onFit={fit}
            panelOpen={panelOpen}
            onTogglePanel={desktop ? () => setPrefs({ panelOpen: !panelOpen }) : undefined}
          />
        </div>

        <div className={cn("pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-[5] flex justify-center px-3 lg:bottom-8", slide, centreWithPanel)}>
          <div className="flex flex-col items-center gap-2">
            {tool === "polygon" && corners > 0 ? (
              <div className="pointer-events-auto">
                <PolygonBar
                  corners={corners}
                  finishDisabled={!editable}
                  onFinish={interactions.finishPolygon}
                  onUndoPoint={interactions.undoPolygonPoint}
                  onCancel={() => void interactions.cancelShape()}
                />
              </div>
            ) : null}
            <ToolDock tool={tool} onToolChange={setTool} disabledReason={disabledReason} className="pointer-events-auto" />
          </div>
        </div>
      </section>

      <aside
        aria-label={t("panelLabel")}
        inert={desktop && !panelOpen ? true : undefined}
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex min-h-0 flex-col overflow-hidden rounded-t-2xl bg-card shadow-lg ring-1 ring-foreground/10",
          "lg:inset-x-auto lg:top-3 lg:bottom-3 lg:end-3 lg:w-[22.5rem] lg:rounded-2xl",
          slide,
          !panelOpen && "lg:pointer-events-none lg:ltr:translate-x-[calc(100%+1rem)] lg:rtl:-translate-x-[calc(100%+1rem)]",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong lg:hidden" aria-hidden />
        <div className="flex items-center gap-2 px-4 pt-1 pb-2 lg:hidden">
          <button
            type="button"
            aria-expanded={mobileExpanded}
            aria-controls="region-editor-panel-body"
            onClick={() => setMobileExpanded((value) => !value)}
            className="flex min-w-0 flex-1 flex-col items-start rounded-md py-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <span className="max-w-full truncate text-sm font-semibold">{region.name}</span>
            <span className="tabular flex items-center gap-1.5 text-xs text-muted-foreground">
              {t("cellCount", { count: snapshot.count, formatted: fmtCount(snapshot.count, locale) })}
              {snapshot.dirty ? (
                <span className="flex items-center gap-1 text-foreground">
                  <TriangleAlert className="size-3 text-warning" aria-hidden />
                  {t("unsavedShort")}
                </span>
              ) : null}
            </span>
          </button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="md"
                    onClick={save}
                    loading={saving}
                    focusableWhenDisabled
                    disabled={!editable || !snapshot.dirty || snapshot.count === 0}
                  />
                }
              >
                {t("save")}
              </TooltipTrigger>
              <TooltipContent>{lockReason ?? t("save")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={mobileExpanded}
            aria-controls="region-editor-panel-body"
            aria-label={mobileExpanded ? t("collapsePanel") : t("expandPanel")}
            onClick={() => setMobileExpanded((value) => !value)}
            className="text-muted-foreground aria-expanded:bg-transparent aria-expanded:text-muted-foreground hover:text-foreground"
          >
            <ChevronUp
              className={cn("transition-transform duration-200 motion-reduce:transition-none", mobileExpanded && "rotate-180")}
              aria-hidden
            />
          </Button>
        </div>
        {desktop ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b">{panelTop}</div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div>{panelDetails}</div>
            </div>
          </div>
        ) : (
          <div
            id="region-editor-panel-body"
            inert={mobileExpanded ? undefined : true}
            className={cn(
              "grid min-h-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
              mobileExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="max-h-[55dvh] overflow-y-auto border-t pb-[env(safe-area-inset-bottom)]">
                <div>
                  <div className="border-b">{panelTop}</div>
                  {panelDetails}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel disabled={deleting}>{confirmCopy?.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              loading={deleting}
              className={confirmCopy?.danger ? "bg-danger text-danger-foreground hover:bg-danger/90" : undefined}
            >
              {confirmCopy?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
