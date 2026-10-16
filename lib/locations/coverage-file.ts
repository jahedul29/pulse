import { normalizeMgrsCode, toCellCode } from "@/lib/mgrs/mgrs";
import { COVERAGE_FILE_ORIGIN, COVERAGE_FILE_PROXY_PATH, COVERAGE_OBJECT_PATTERN } from "./coverage-origin";

export interface CoverageFile {
  version: number | null;
  codes: string[];
}

export function coverageFileRequestUrl(tilesUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(tilesUrl);
  } catch {
    return null;
  }
  if (url.origin !== COVERAGE_FILE_ORIGIN || !COVERAGE_OBJECT_PATTERN.test(url.pathname)) return null;
  return `${COVERAGE_FILE_PROXY_PATH}${url.pathname}`;
}

export function parseCoverageFile(body: unknown): CoverageFile {
  const record = body && typeof body === "object" ? (body as { version?: unknown; tiles?: unknown }) : {};
  const codes = new Set<string>();
  for (const tile of Array.isArray(record.tiles) ? record.tiles : []) {
    if (!tile || typeof tile !== "object") continue;
    const { t: code, a: active } = tile as { t?: unknown; a?: unknown };
    if (typeof code !== "string" || !code.trim() || active === false) continue;
    const normalized = normalizeMgrsCode(code);
    codes.add(toCellCode(normalized) ?? normalized);
  }
  return { version: typeof record.version === "number" ? record.version : null, codes: [...codes] };
}

export async function fetchCoverageFile(tilesUrl: string, signal?: AbortSignal): Promise<CoverageFile> {
  const requestUrl = coverageFileRequestUrl(tilesUrl);
  if (!requestUrl) throw new Error("Tiles file is not on the coverage file host");
  const response = await fetch(requestUrl, { signal });
  if (!response.ok) throw new Error(`Tiles file request failed with status ${response.status}`);
  return parseCoverageFile(await response.json());
}
