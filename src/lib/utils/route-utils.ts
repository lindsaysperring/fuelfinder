import type { BoundingBox } from './config';
import type { BrandDiscount, Coordinates, RouteStation, Station } from '@/types';

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      sinDLng *
      sinDLng;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Computes the bounding box that encloses all waypoints, expanded by bufferKm.
 */
export function routeBoundingBox(
  waypoints: Coordinates[],
  bufferKm: number
): BoundingBox {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const wp of waypoints) {
    if (wp.latitude < minLat) minLat = wp.latitude;
    if (wp.latitude > maxLat) maxLat = wp.latitude;
    if (wp.longitude < minLng) minLng = wp.longitude;
    if (wp.longitude > maxLng) maxLng = wp.longitude;
  }

  const latDelta = (bufferKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const midLat = (minLat + maxLat) / 2;
  const lngDelta =
    (bufferKm / EARTH_RADIUS_KM) * (180 / Math.PI) * (1 / Math.cos(toRad(midLat)));

  return {
    neLat: maxLat + latDelta,
    neLng: maxLng + lngDelta,
    swLat: minLat - latDelta,
    swLng: minLng - lngDelta,
  };
}

/**
 * Returns the minimum haversine distance (km) from a point to any waypoint.
 */
export function minDistanceToRoute(
  point: Coordinates,
  waypoints: Coordinates[]
): number {
  let min = Infinity;
  for (const wp of waypoints) {
    const d = haversineKm(point, wp);
    if (d < min) min = d;
  }
  return min;
}

export interface StationScoringInput {
  station: Station;
  fuelType: string;
  fuelEconomy: number; // L/100km
  fillAmount: number; // litres
  arriveFullEnabled: boolean;
  tankSizeLitres: number;
  brandDiscounts: BrandDiscount[];
  distanceFromStart: number; // km (driving)
  distanceToEnd: number; // km (driving)
  totalRouteKm: number;
  detourToleranceKm: number;
}

export interface ScoredStation extends RouteStation {
  pricePerLiter: number;
}

export function scoreStation(input: StationScoringInput): ScoredStation | null {
  const {
    station,
    fuelType,
    fuelEconomy,
    fillAmount: userFillAmount,
    arriveFullEnabled,
    tankSizeLitres,
    brandDiscounts,
    distanceFromStart,
    distanceToEnd,
    totalRouteKm,
    detourToleranceKm,
  } = input;

  const price = station.prices[fuelType];
  if (!price) return null;

  const viaKm = distanceFromStart + distanceToEnd;
  const detourKm = Math.max(0, viaKm - totalRouteKm);

  if (detourKm > detourToleranceKm) return null;

  const discountCents =
    brandDiscounts.find(
      (d) => d.brand.toLowerCase() === station.brand.toLowerCase()
    )?.discount ?? 0;

  const pricePerLiter = (price.amount - discountCents) / 100; // dollars
  const fillAmount = arriveFullEnabled ? tankSizeLitres : userFillAmount;
  const fillCost = pricePerLiter * fillAmount;

  // Cost of the extra fuel burned doing the detour
  const detourCost = (detourKm * fuelEconomy) / 100 / pricePerLiter;
  const totalCost = fillCost + detourCost;

  // travel cost from user's start to station (informational)
  const travelCost = (distanceFromStart * fuelEconomy) / 100 / pricePerLiter;

  return {
    ...station,
    distance: distanceFromStart,
    travelCost,
    totalCost,
    pricePerLiter,
    discount: discountCents,
    detourKm,
    distanceFromStart,
    distanceToEnd,
    fillAmount,
    fillCost,
    detourCost,
  };
}

/**
 * Pre-filters station candidates to those plausibly within the detour corridor.
 * Uses straight-line distance to the nearest route waypoint as a cheap gate.
 * The margin accounts for the fact that haversine underestimates driving distance.
 */
export function preFilterStations(
  stations: Station[],
  waypoints: Coordinates[],
  fuelType: string,
  detourToleranceKm: number,
  maxCandidates = 25
): Station[] {
  const margin = Math.max(5, detourToleranceKm); // always at least 5km of slack
  return stations
    .filter((s) => {
      if (!s.prices[fuelType]) return false;
      const coord: Coordinates = { latitude: s.location.y, longitude: s.location.x };
      return minDistanceToRoute(coord, waypoints) <= detourToleranceKm + margin;
    })
    .slice(0, maxCandidates);
}
