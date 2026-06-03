import { describe, it, expect } from 'vitest';
import { decodePolyline, pointToSegmentDistance, minDistanceToRoute } from '../polyline';

describe('decodePolyline', () => {
  it('should decode a simple polyline', () => {
    // Encoded "A" at low precision = single point near origin
    const points = decodePolyline('_p~iF~ps|U');
    expect(points.length).toBe(1);
    expect(points[0].lat).toBeCloseTo(38.5, 0);
    expect(points[0].lng).toBeCloseTo(-120.2, 0);
  });

  it('should decode a multi-point polyline', () => {
    // A well-known encoded polyline: Adelaide to Melbourne roughly
    const encoded = 'rvumEg{xt[`@zA`@zA';
    const points = decodePolyline(encoded);
    expect(points.length).toBeGreaterThan(1);
  });

  it('should return empty array for empty string', () => {
    const points = decodePolyline('');
    expect(points).toEqual([]);
  });

  it('should handle single-point polyline', () => {
    // A single point polyline
    const encoded = '??'; // minimal encoding of (0, 0) approximately
    const points = decodePolyline(encoded);
    expect(points.length).toBe(1);
  });
});

describe('pointToSegmentDistance', () => {
  it('should return 0 when point is on segment', () => {
    const point = { lat: -34.92, lng: 138.60 };
    const a = { lat: -34.90, lng: 138.58 };
    const b = { lat: -34.94, lng: 138.62 };
    const dist = pointToSegmentDistance(point, a, b);
    // Point should be very close to the segment
    expect(dist).toBeLessThan(1);
  });

  it('should return distance to nearest endpoint when point projects outside segment', () => {
    const point = { lat: -34.80, lng: 138.50 };
    const a = { lat: -34.90, lng: 138.58 };
    const b = { lat: -34.94, lng: 138.62 };
    const dist = pointToSegmentDistance(point, a, b);
    // Should be a meaningful distance
    expect(dist).toBeGreaterThan(5);
  });

  it('should handle zero-length segment (fallback to haversine)', () => {
    const point = { lat: -34.92, lng: 138.60 };
    const a = { lat: -34.90, lng: 138.58 };
    const dist = pointToSegmentDistance(point, a, a);
    // Should be haversine distance from point to a
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(10);
  });

  it('should return correct distance for a point at segment midpoint', () => {
    // Two points ~10km apart
    const a = { lat: -34.90, lng: 138.50 };
    const b = { lat: -35.00, lng: 138.70 };
    const midpoint = { lat: -34.95, lng: 138.60 };
    const dist = pointToSegmentDistance(midpoint, a, b);
    // Midpoint should be close to the segment
    expect(dist).toBeLessThan(1);
  });
});

describe('minDistanceToRoute', () => {
  it('should return 0 for a point on the route', () => {
    const route = [
      { lat: -34.90, lng: 138.50 },
      { lat: -34.92, lng: 138.55 },
      { lat: -34.94, lng: 138.60 }
    ];
    const point = { lat: -34.92, lng: 138.55 };
    const dist = minDistanceToRoute(point, route);
    expect(dist).toBeLessThan(0.1);
  });

  it('should return correct distance for a point near the route', () => {
    const route = [
      { lat: -34.90, lng: 138.50 },
      { lat: -34.92, lng: 138.55 },
      { lat: -34.94, lng: 138.60 }
    ];
    const point = { lat: -34.91, lng: 138.52 };
    const dist = minDistanceToRoute(point, route);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(5);
  });

  it('should return Infinity for empty route', () => {
    const point = { lat: -34.92, lng: 138.55 };
    const dist = minDistanceToRoute(point, []);
    expect(dist).toBe(Infinity);
  });

  it('should handle single-point route', () => {
    const route = [{ lat: -34.90, lng: 138.50 }];
    const point = { lat: -34.92, lng: 138.55 };
    const dist = minDistanceToRoute(point, route);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(10);
  });

  it('should find minimum distance across multiple segments', () => {
    const route = [
      { lat: -34.90, lng: 138.50 },
      { lat: -34.95, lng: 138.55 },
      { lat: -35.00, lng: 138.60 }
    ];
    // Point is close to the first segment but far from second
    const point = { lat: -34.91, lng: 138.505 };
    const dist = minDistanceToRoute(point, route);
    expect(dist).toBeLessThan(2);
  });
});