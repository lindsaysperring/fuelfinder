import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchAlongRouteAction } from '../route-actions';

const { getRouteMock, getStationRouteMock, fetchStationsMock } = vi.hoisted(() => ({
  getRouteMock: vi.fn(),
  getStationRouteMock: vi.fn(),
  fetchStationsMock: vi.fn()
}));

vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
  getRateLimitIdentifier: vi.fn().mockResolvedValue('test-identifier')
}));

vi.mock('@/lib/services/route-service', () => ({
  RouteService: {
    getRoute: getRouteMock,
    getStationRoute: getStationRouteMock
  }
}));

vi.mock('@/actions/petrolspy-actions', () => ({
  fetchPetrolStationsAction: fetchStationsMock
}));

const ORIGIN = { latitude: -34.9285, longitude: 138.6007 };
const DESTINATION = { latitude: -34.83, longitude: 138.6 };

const FAKE_ROUTE = {
  polyline: encodePolyline([
    { lat: ORIGIN.latitude, lng: ORIGIN.longitude },
    { lat: DESTINATION.latitude, lng: DESTINATION.longitude }
  ]),
  distance: 11,
  duration: 900,
  bounds: {
    neLat: -34.82,
    neLng: 138.62,
    swLat: -34.94,
    swLng: 138.58
  }
};

function encodePolyline(points: Array<{ lat: number; lng: number }>): string {
  let result = '';
  let prevLat = 0;
  let prevLng = 0;

  const encode = (value: number): string => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let out = '';
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
    return out;
  };

  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    result += encode(lat - prevLat) + encode(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return result;
}

function makeStation(id: string, lat: number, lng: number, price: number) {
  return {
    id,
    name: `Station ${id}`,
    brand: 'Shell',
    address: '1 Test St',
    location: { x: lng, y: lat },
    prices: { U91: { amount: price, type: 'U91' } }
  };
}

describe('searchAlongRouteAction destination distance filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRouteMock.mockResolvedValue(FAKE_ROUTE);
    fetchStationsMock.mockResolvedValue({ success: true, data: { message: { list: [] } } });
  });

  it('drops stations beyond the max distance and returns top 10 by exact totalCost', async () => {
    const nearStations = Array.from({ length: 11 }, (_, i) =>
      makeStation(`price-${100 + i}`, DESTINATION.latitude + i * 0.00005, DESTINATION.longitude, 100 + i)
    );
    const farExact = makeStation('far-exact', DESTINATION.latitude + 0.001, DESTINATION.longitude, 90);
    const farPreFilter = makeStation('far-prefilter', ORIGIN.latitude, ORIGIN.longitude, 80);

    fetchStationsMock.mockResolvedValue({
      success: true,
      data: { message: { list: [farExact, farPreFilter, ...nearStations] } }
    });

    getStationRouteMock.mockImplementation((...args) => {
      const station = args[1] as { latitude: number };
      if (station.latitude === farExact.location.y) {
        return Promise.resolve({ detourKm: 1, distanceToDestinationKm: 6 });
      }
      return Promise.resolve({ detourKm: 1, distanceToDestinationKm: 1 });
    });

    const result = await searchAlongRouteAction({
      origin: ORIGIN,
      destination: DESTINATION,
      fuelType: 'U91',
      fuelEconomy: 8,
      fillAmount: 40,
      brandDiscounts: [],
      maxDestDistanceKm: 5
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.stations).toHaveLength(10);
    const ids = result.data.stations.map(s => s.id);
    expect(ids).not.toContain('far-exact');
    expect(ids).not.toContain('far-prefilter');
    expect(ids[0]).toBe('price-100');
    for (let i = 1; i < result.data.stations.length; i++) {
      expect(result.data.stations[i].totalCost).toBeGreaterThanOrEqual(result.data.stations[i - 1].totalCost);
    }

    expect(getStationRouteMock).toHaveBeenCalledTimes(12);
    expect(getStationRouteMock.mock.calls.some(c => c[1].latitude === farPreFilter.location.y)).toBe(false);
  });

  it('keeps null-route stations with approximate values and only resolves exact routes for the top 10', async () => {
    const stations = Array.from({ length: 12 }, (_, i) =>
      makeStation(`price-${100 + i}`, DESTINATION.latitude + i * 0.00005, DESTINATION.longitude, 100 + i)
    );

    fetchStationsMock.mockResolvedValue({
      success: true,
      data: { message: { list: stations } }
    });

    const nullLats = new Set([
      DESTINATION.latitude,
      DESTINATION.latitude + 2 * 0.00005,
      DESTINATION.latitude + 4 * 0.00005
    ]);

    getStationRouteMock.mockImplementation((...args) => {
      const station = args[1] as { latitude: number };
      if (nullLats.has(station.latitude)) {
        return Promise.resolve(null);
      }
      return Promise.resolve({ detourKm: 2, distanceToDestinationKm: 3 });
    });

    const result = await searchAlongRouteAction({
      origin: ORIGIN,
      destination: DESTINATION,
      fuelType: 'U91',
      fuelEconomy: 8,
      fillAmount: 40,
      brandDiscounts: [],
      maxDestDistanceKm: 0
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const ids = result.data.stations.map(s => s.id);
    expect(result.data.stations).toHaveLength(10);
    expect(ids).toContain('price-100');
    expect(ids).toContain('price-102');
    expect(ids).toContain('price-104');
    expect(ids).not.toContain('price-110');
    expect(ids).not.toContain('price-111');

    const nullStation = result.data.stations.find(s => s.id === 'price-100');
    expect(nullStation?.exactDetour).toBeNull();
    expect(nullStation?.totalCost).toBeCloseTo(1, 5);

    const exactStation = result.data.stations.find(s => s.id === 'price-101');
    expect(exactStation?.exactDetour).toBe(2);

    expect(getStationRouteMock).toHaveBeenCalledTimes(10);
    const calledLats = getStationRouteMock.mock.calls.map(c => c[1].latitude);
    expect(calledLats).not.toContain(DESTINATION.latitude + 10 * 0.00005);
    expect(calledLats).not.toContain(DESTINATION.latitude + 11 * 0.00005);
  });

  it('passes avoidTolls true to getRoute and getStationRoute when enabled', async () => {
    getRouteMock.mockResolvedValue(FAKE_ROUTE);
    fetchStationsMock.mockResolvedValue({
      success: true,
      data: { message: { list: [makeStation('a', DESTINATION.latitude, DESTINATION.longitude, 100)] } }
    });
    getStationRouteMock.mockResolvedValue({ detourKm: 1, distanceToDestinationKm: 1 });

    await searchAlongRouteAction({
      origin: ORIGIN,
      destination: DESTINATION,
      fuelType: 'U91',
      fuelEconomy: 8,
      fillAmount: 40,
      brandDiscounts: [],
      avoidTolls: true
    });

    expect(getRouteMock).toHaveBeenCalledWith(ORIGIN, DESTINATION, true);
    expect(getStationRouteMock.mock.calls.some(c => c[4] === true)).toBe(true);
  });

  it('defaults avoidTolls to true when omitted', async () => {
    getStationRouteMock.mockResolvedValue({ detourKm: 1, distanceToDestinationKm: 1 });

    await searchAlongRouteAction({
      origin: ORIGIN,
      destination: DESTINATION,
      fuelType: 'U91',
      fuelEconomy: 8,
      fillAmount: 40,
      brandDiscounts: []
    });

    expect(getRouteMock).toHaveBeenCalledWith(ORIGIN, DESTINATION, true);
  });

  it('passes avoidTolls false through to getRoute', async () => {
    getStationRouteMock.mockResolvedValue({ detourKm: 1, distanceToDestinationKm: 1 });

    await searchAlongRouteAction({
      origin: ORIGIN,
      destination: DESTINATION,
      fuelType: 'U91',
      fuelEconomy: 8,
      fillAmount: 40,
      brandDiscounts: [],
      avoidTolls: false
    });

    expect(getRouteMock).toHaveBeenCalledWith(ORIGIN, DESTINATION, false);
  });
});
