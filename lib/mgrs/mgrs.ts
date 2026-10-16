import { centralMeridian, fromUtm, toUtm } from "./utm";

export interface MgrsCell {
  zone: number;
  band: string;
  north: boolean;
  easting: number;
  northing: number;
}

export const CELL_SIZE = 1000;

const LATITUDE_BANDS = "CDEFGHJKLMNPQRSTUVWXX";
const COLUMN_LETTER_SETS = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"];
const ROW_LETTERS = "ABCDEFGHJKLMNPQRSTUV";
const SQUARE_SIZE = 100000;
const ROW_CYCLE = 2000000;
const BAND_TOLERANCE = 100000;
const MAX_DIGITS = 10;
const MGRS_PATTERN = /^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z])([A-HJ-NP-V])(\d*)$/;

const bandMinimumCache = new Map<string, number>();

export function normalizeMgrsCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export function floorToCell(metres: number): number {
  return Math.floor(metres / CELL_SIZE) * CELL_SIZE;
}

export function latitudeBand(latitude: number): string {
  const clamped = Math.max(-80, Math.min(latitude, 83.999999));
  return LATITUDE_BANDS[Math.floor((clamped + 80) / 8)];
}

function rowOffset(zone: number): number {
  return zone % 2 === 0 ? 5 : 0;
}

function bandMinimumNorthing(zone: number, band: string): number {
  const key = `${zone}${band}`;
  const cached = bandMinimumCache.get(key);
  if (cached !== undefined) return cached;
  const southLatitude = LATITUDE_BANDS.indexOf(band) * 8 - 80;
  const meridian = centralMeridian(zone);
  const minimum = Math.min(
    toUtm(southLatitude, meridian, zone).northing,
    toUtm(southLatitude, meridian + 3, zone).northing,
  );
  bandMinimumCache.set(key, minimum);
  return minimum;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function cellCode(cell: MgrsCell): string {
  const columnLetter = COLUMN_LETTER_SETS[(cell.zone - 1) % 3][Math.floor(cell.easting / SQUARE_SIZE) - 1];
  if (!columnLetter) throw new RangeError(`Easting ${cell.easting} is outside UTM zone ${cell.zone}`);
  const rowIndex = Math.floor(cell.northing / SQUARE_SIZE) % 20;
  const rowLetter = ROW_LETTERS[(rowIndex + rowOffset(cell.zone)) % 20];
  const eastingKm = Math.floor((cell.easting % SQUARE_SIZE) / CELL_SIZE);
  const northingKm = Math.floor((cell.northing % SQUARE_SIZE) / CELL_SIZE);
  return `${cell.zone}${cell.band}${columnLetter}${rowLetter}${twoDigits(eastingKm)}${twoDigits(northingKm)}`;
}

export function parseMgrs(code: string): MgrsCell | null {
  const match = MGRS_PATTERN.exec(normalizeMgrsCode(code));
  if (!match) return null;
  const [, zoneText, band, columnLetter, rowLetter, digits] = match;
  const zone = Number(zoneText);
  if (zone < 1 || zone > 60 || digits.length % 2 !== 0 || digits.length > MAX_DIGITS) return null;
  const column = COLUMN_LETTER_SETS[(zone - 1) % 3].indexOf(columnLetter);
  if (column < 0) return null;

  const precision = digits.length / 2;
  const scale = 10 ** (5 - precision);
  const eastingWithin = precision ? Number(digits.slice(0, precision)) * scale : 0;
  const northingWithin = precision ? Number(digits.slice(precision)) * scale : 0;

  const rowIndex = (ROW_LETTERS.indexOf(rowLetter) - rowOffset(zone) + 20) % 20;
  let northing = rowIndex * SQUARE_SIZE + northingWithin;
  const minimum = bandMinimumNorthing(zone, band) - BAND_TOLERANCE;
  while (northing < minimum) northing += ROW_CYCLE;

  return {
    zone,
    band,
    north: band >= "N",
    easting: floorToCell((column + 1) * SQUARE_SIZE + eastingWithin),
    northing: floorToCell(northing),
  };
}

export function toCellCode(code: string): string | null {
  const cell = parseMgrs(code);
  return cell ? cellCode(cell) : null;
}

export function gridCell(zone: number, north: boolean, easting: number, northing: number): MgrsCell {
  const cellEasting = floorToCell(easting);
  const cellNorthing = floorToCell(northing);
  const center = fromUtm({
    zone,
    north,
    easting: cellEasting + CELL_SIZE / 2,
    northing: cellNorthing + CELL_SIZE / 2,
  });
  return { zone, band: latitudeBand(center.latitude), north, easting: cellEasting, northing: cellNorthing };
}

export function cellAt(latitude: number, longitude: number): MgrsCell {
  const point = toUtm(latitude, longitude);
  return gridCell(point.zone, point.north, point.easting, point.northing);
}

export function cellCodeAt(latitude: number, longitude: number): string {
  return cellCode(cellAt(latitude, longitude));
}

export function safeCellCodeAt(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -80 || latitude > 84) return null;
  try {
    return cellCode(cellAt(latitude, longitude));
  } catch {
    return null;
  }
}

export function formatMgrsCode(code: string): string {
  const match = /^(\d{1,2}[C-HJ-NP-X])([A-HJ-NP-Z][A-HJ-NP-V])(\d*)$/.exec(normalizeMgrsCode(code));
  if (!match || match[3].length % 2 !== 0) return code;
  const half = match[3].length / 2;
  return [match[1], match[2], match[3].slice(0, half), match[3].slice(half)].filter(Boolean).join(" ");
}
