export interface UtmPoint {
  zone: number;
  north: boolean;
  easting: number;
  northing: number;
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

const SEMI_MAJOR_AXIS = 6378137;
const FLATTENING = 1 / 298.257223563;
const SCALE_FACTOR = 0.9996;
const FALSE_EASTING = 500000;
export const FALSE_NORTHING_SOUTH = 10000000;
const SERIES_ORDER = 6;
const MAX_LATITUDE_ITERATIONS = 10;

const thirdFlattening = FLATTENING / (2 - FLATTENING);
const eccentricity = Math.sqrt(FLATTENING * (2 - FLATTENING));
const eccentricitySquared = eccentricity * eccentricity;
const powers = Array.from({ length: SERIES_ORDER + 1 }, (_, exponent) => thirdFlattening ** exponent);

const rectifyingRadius =
  (SEMI_MAJOR_AXIS / (1 + thirdFlattening)) * (1 + powers[2] / 4 + powers[4] / 64 + powers[6] / 256);
const scaledRadius = SCALE_FACTOR * rectifyingRadius;

const FORWARD_SERIES = [
  0,
  powers[1] / 2 - (2 / 3) * powers[2] + (5 / 16) * powers[3] + (41 / 180) * powers[4] - (127 / 288) * powers[5] + (7891 / 37800) * powers[6],
  (13 / 48) * powers[2] - (3 / 5) * powers[3] + (557 / 1440) * powers[4] + (281 / 630) * powers[5] - (1983433 / 1935360) * powers[6],
  (61 / 240) * powers[3] - (103 / 140) * powers[4] + (15061 / 26880) * powers[5] + (167603 / 181440) * powers[6],
  (49561 / 161280) * powers[4] - (179 / 168) * powers[5] + (6601661 / 7257600) * powers[6],
  (34729 / 80640) * powers[5] - (3418889 / 1995840) * powers[6],
  (212378941 / 319334400) * powers[6],
];

const INVERSE_SERIES = [
  0,
  powers[1] / 2 - (2 / 3) * powers[2] + (37 / 96) * powers[3] - (1 / 360) * powers[4] - (81 / 512) * powers[5] + (96199 / 604800) * powers[6],
  (1 / 48) * powers[2] + (1 / 15) * powers[3] - (437 / 1440) * powers[4] + (46 / 105) * powers[5] - (1118711 / 3870720) * powers[6],
  (17 / 480) * powers[3] - (37 / 840) * powers[4] - (209 / 4480) * powers[5] + (5569 / 90720) * powers[6],
  (4397 / 161280) * powers[4] - (11 / 504) * powers[5] - (830251 / 7257600) * powers[6],
  (4583 / 161280) * powers[5] - (108847 / 3991680) * powers[6],
  (20648693 / 638668800) * powers[6],
];

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function centralMeridian(zone: number): number {
  return (zone - 1) * 6 - 180 + 3;
}

export function utmZoneFor(latitude: number, longitude: number): number {
  const zone = Math.min(60, Math.floor((longitude + 180) / 6) + 1);
  if (latitude >= 56 && latitude < 64 && longitude >= 3 && longitude < 12) return 32;
  if (latitude >= 72 && latitude < 84) {
    if (longitude >= 0 && longitude < 9) return 31;
    if (longitude >= 9 && longitude < 21) return 33;
    if (longitude >= 21 && longitude < 33) return 35;
    if (longitude >= 33 && longitude < 42) return 37;
  }
  return zone;
}

function conformalTangent(tangent: number): number {
  const sigma = Math.sinh(eccentricity * Math.atanh((eccentricity * tangent) / Math.sqrt(1 + tangent * tangent)));
  return tangent * Math.sqrt(1 + sigma * sigma) - sigma * Math.sqrt(1 + tangent * tangent);
}

export function toUtm(latitude: number, longitude: number, zone = utmZoneFor(latitude, longitude)): UtmPoint {
  const lambda = toRadians(longitude - centralMeridian(zone));
  const tauPrime = conformalTangent(Math.tan(toRadians(latitude)));
  const cosLambda = Math.cos(lambda);
  const xiPrime = Math.atan2(tauPrime, cosLambda);
  const etaPrime = Math.asinh(Math.sin(lambda) / Math.sqrt(tauPrime * tauPrime + cosLambda * cosLambda));

  let xi = xiPrime;
  let eta = etaPrime;
  for (let j = 1; j <= SERIES_ORDER; j++) {
    xi += FORWARD_SERIES[j] * Math.sin(2 * j * xiPrime) * Math.cosh(2 * j * etaPrime);
    eta += FORWARD_SERIES[j] * Math.cos(2 * j * xiPrime) * Math.sinh(2 * j * etaPrime);
  }

  const north = latitude >= 0;
  return {
    zone,
    north,
    easting: scaledRadius * eta + FALSE_EASTING,
    northing: scaledRadius * xi + (north ? 0 : FALSE_NORTHING_SOUTH),
  };
}

export function fromUtm({ zone, north, easting, northing }: UtmPoint): GeoPosition {
  const eta = (easting - FALSE_EASTING) / scaledRadius;
  const xi = (north ? northing : northing - FALSE_NORTHING_SOUTH) / scaledRadius;

  let xiPrime = xi;
  let etaPrime = eta;
  for (let j = 1; j <= SERIES_ORDER; j++) {
    xiPrime -= INVERSE_SERIES[j] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaPrime -= INVERSE_SERIES[j] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }

  const sinhEtaPrime = Math.sinh(etaPrime);
  const cosXiPrime = Math.cos(xiPrime);
  const tauPrime = Math.sin(xiPrime) / Math.sqrt(sinhEtaPrime * sinhEtaPrime + cosXiPrime * cosXiPrime);

  let tangent = tauPrime;
  for (let iteration = 0; iteration < MAX_LATITUDE_ITERATIONS; iteration++) {
    const tangentPrime = conformalTangent(tangent);
    const step =
      ((tauPrime - tangentPrime) / Math.sqrt(1 + tangentPrime * tangentPrime)) *
      ((1 + (1 - eccentricitySquared) * tangent * tangent) /
        ((1 - eccentricitySquared) * Math.sqrt(1 + tangent * tangent)));
    tangent += step;
    if (Math.abs(step) < 1e-12) break;
  }

  return {
    latitude: toDegrees(Math.atan(tangent)),
    longitude: centralMeridian(zone) + toDegrees(Math.atan2(sinhEtaPrime, cosXiPrime)),
  };
}
