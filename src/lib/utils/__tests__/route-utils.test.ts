import { describe, expect, it } from 'vitest';
import {
  haversineKm,
  minDistanceToRoute,
  preFilterStations,
  routeBoundingBox,
  scoreStation,
} from '../route-utils';
import type { Station } from '@/types';

// Adelaide, Glenelg, Mount Barker — real SA coordinates
const ADELAIDE: { latitude: number; longitude: number } = {
  latitude: -34.9285,
  longitude: 138.6007,
};
const MOUNT_BARKER: { latitude: number; longitude: number } = {
  latitude: -35.0667,
  longitude: 138.8572,
};
const GLENELG: { latitude: number; longitude: number } = {
  latitude: -34.9798,
  longitude: 138.5162,
};

const BRAND_DISCOUNTS = [{ brand: 'AMPOL', discount: 8 }];

function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    id: 'test-1',
    name: 'Test Station',
    brand: 'AMPOL',
    address: '1 Test St',
    location: { x: GLENELG.longitude, y: GLENELG.latitude },
    prices: { U91: { amount: 195, type: 'U91' } },
    ...overrides,
  };
}

describe('haversineKm', () => {
  it('returns ~0 for same point', () => {
    expect(haversineKm(ADELAIDE, ADELAIDE)).toBeCloseTo(0, 3);
  });

  it('calculates known distance between Adelaide and Glenelg (~9 km)', () => {
    const d = haversineKm(ADELAIDE, GLENELG);
    expect(d).toBeGreaterThan(7);
    expect(d).toBeLessThan(12);
  });

  it('is symmetric', () => {
    const a = haversineKm(ADELAIDE, MOUNT_BARKER);
    const b = haversineKm(MOUNT_BARKER, ADELAIDE);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('routeBoundingBox', () => {
  const waypoints = [ADELAIDE, MOUNT_BARKER];

  it('produces bbox that contains all waypoints', () => {
    const bbox = routeBoundingBox(waypoints, 0);
    expect(bbox.swLat).toBeLessThanOrEqual(MOUNT_BARKER.latitude);
    expect(bbox.neLat).toBeGreaterThanOrEqual(ADELAIDE.latitude);
    expect(bbox.swLng).toBeLessThanOrEqual(ADELAIDE.longitude);
    expect(bbox.neLng).toBeGreaterThanOrEqual(MOUNT_BARKER.longitude);
  });

  it('expands bbox by buffer amount', () => {
    const tight = routeBoundingBox(waypoints, 0);
    const wide = routeBoundingBox(waypoints, 10);
    expect(wide.neLat).toBeGreaterThan(tight.neLat);
    expect(wide.swLat).toBeLessThan(tight.swLat);
    expect(wide.neLng).toBeGreaterThan(tight.neLng);
    expect(wide.swLng).toBeLessThan(tight.swLng);
  });
});

describe('minDistanceToRoute', () => {
  it('returns 0 when point is a waypoint', () => {
    expect(minDistanceToRoute(ADELAIDE, [ADELAIDE, MOUNT_BARKER])).toBeCloseTo(0, 3);
  });

  it('finds closest waypoint from a nearby point', () => {
    const d = minDistanceToRoute(GLENELG, [ADELAIDE, MOUNT_BARKER]);
    // Glenelg is ~9km from Adelaide, ~30km from Mount Barker
    expect(d).toBeCloseTo(haversineKm(GLENELG, ADELAIDE), 1);
  });
});

describe('scoreStation', () => {
  const base = {
    fuelType: 'U91',
    fuelEconomy: 10, // L/100km
    fillAmount: 40,
    arriveFullEnabled: false,
    tankSizeLitres: 50,
    brandDiscounts: BRAND_DISCOUNTS,
    distanceFromStart: 5, // km
    distanceToEnd: 20, // km
    totalRouteKm: 24, // direct route
    detourToleranceKm: 5,
  };

  it('returns null when station has no price for the requested fuel type', () => {
    const station = makeStation({ prices: { DIESEL: { amount: 200, type: 'DIESEL' } } });
    expect(scoreStation({ ...base, station })).toBeNull();
  });

  it('returns null when detour exceeds tolerance', () => {
    // via = 5 + 20 = 25; detour = 25 - 24 = 1 km (within tolerance of 5)
    // Increase distances to force a big detour
    const result = scoreStation({
      ...base,
      station: makeStation(),
      distanceFromStart: 10,
      distanceToEnd: 25,
      totalRouteKm: 24, // detour = 10+25-24 = 11 > 5
    });
    expect(result).toBeNull();
  });

  it('computes fill cost with brand discount applied', () => {
    // price = 195 cents, discount = 8 cents → net 187 cents = $1.87/L
    const result = scoreStation({ ...base, station: makeStation() });
    expect(result).not.toBeNull();
    expect(result!.pricePerLiter).toBeCloseTo(1.87, 2);
    expect(result!.fillCost).toBeCloseTo(1.87 * 40, 1); // fillAmount = 40L
  });

  it('uses tankSizeLitres for fill amount when arriveFullEnabled', () => {
    const result = scoreStation({
      ...base,
      station: makeStation(),
      arriveFullEnabled: true,
      tankSizeLitres: 55,
    });
    expect(result).not.toBeNull();
    expect(result!.fillAmount).toBe(55);
  });

  it('computes detour cost for an off-route station', () => {
    // via = 5 + 22 = 27; detour = 27 - 24 = 3 km
    const result = scoreStation({
      ...base,
      station: makeStation(),
      distanceFromStart: 5,
      distanceToEnd: 22,
      totalRouteKm: 24,
    });
    expect(result).not.toBeNull();
    expect(result!.detourKm).toBeCloseTo(3, 5);
    expect(result!.detourCost).toBeGreaterThan(0);
  });

  it('sets detourKm to 0 for on-route stations', () => {
    // via = 5 + 19 = 24 = totalRoute → no detour
    const result = scoreStation({
      ...base,
      station: makeStation(),
      distanceFromStart: 5,
      distanceToEnd: 19,
      totalRouteKm: 24,
    });
    expect(result).not.toBeNull();
    expect(result!.detourKm).toBe(0);
  });
});

describe('preFilterStations', () => {
  const waypoints = [ADELAIDE, MOUNT_BARKER];
  const nearStation = makeStation({
    id: 'near',
    location: { x: GLENELG.longitude, y: GLENELG.latitude },
  });
  // A station far away (e.g. Darwin — ~2700 km north)
  const farStation = makeStation({
    id: 'far',
    location: { x: 130.8, y: -12.4 },
  });

  it('keeps stations near the route', () => {
    const result = preFilterStations([nearStation], waypoints, 'U91', 5);
    expect(result).toHaveLength(1);
  });

  it('excludes stations far from the route', () => {
    const result = preFilterStations([farStation], waypoints, 'U91', 5);
    expect(result).toHaveLength(0);
  });

  it('excludes stations that do not have the requested fuel type', () => {
    const dieselOnly = makeStation({
      id: 'near-diesel',
      location: { x: GLENELG.longitude, y: GLENELG.latitude },
      prices: { DIESEL: { amount: 200, type: 'DIESEL' } },
    });
    expect(preFilterStations([dieselOnly], waypoints, 'U91', 5)).toHaveLength(0);
  });

  it('caps results at maxCandidates', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      makeStation({ id: `s${i}`, location: { x: ADELAIDE.longitude, y: ADELAIDE.latitude } })
    );
    const result = preFilterStations(many, waypoints, 'U91', 20, 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});
