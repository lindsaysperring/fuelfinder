import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteService, computeDetourAndDistanceKm } from '../route-service';

const { directionsMock } = vi.hoisted(() => ({
  directionsMock: vi.fn()
}));

vi.mock('@googlemaps/google-maps-services-js', () => {
  class Client {
    directions = directionsMock
  }
  return {
    Client,
    TravelMode: { driving: 'driving' },
    TravelRestriction: { tolls: 'tolls' }
  }
});

describe('computeDetourAndDistanceKm', () => {
  it('computes detour and last-leg distance', () => {
    const legs = [
      { distance: { value: 5000 } },
      { distance: { value: 3000 } }
    ];
    const result = computeDetourAndDistanceKm(legs, 6);
    expect(result.detourKm).toBeCloseTo(2, 5);
    expect(result.distanceToDestinationKm).toBeCloseTo(3, 5);
  });

  it('clamps detour to 0 when waypoint route is shorter than original', () => {
    const legs = [
      { distance: { value: 2000 } },
      { distance: { value: 2000 } }
    ];
    const result = computeDetourAndDistanceKm(legs, 10);
    expect(result.detourKm).toBe(0);
    expect(result.distanceToDestinationKm).toBeCloseTo(2, 5);
  });

  it('uses the last leg as distance to destination', () => {
    const legs = [{ distance: { value: 5000 } }];
    const result = computeDetourAndDistanceKm(legs, 5);
    expect(result.detourKm).toBeCloseTo(0, 5);
    expect(result.distanceToDestinationKm).toBeCloseTo(5, 5);
  });

  it('handles empty legs', () => {
    const result = computeDetourAndDistanceKm([], 5);
    expect(result.detourKm).toBe(0);
    expect(result.distanceToDestinationKm).toBe(0);
  });
});

describe('RouteService avoid tolls params', () => {
  const ORIGIN = { latitude: -34.9285, longitude: 138.6007 };
  const DESTINATION = { latitude: -34.83, longitude: 138.6 };

  const getRouteResponse = {
    data: {
      status: 'OK',
      routes: [
        {
          legs: [{ distance: { value: 10000 }, duration: { value: 600 } }],
          bounds: {
            northeast: { lat: -34.82, lng: 138.62 },
            southwest: { lat: -34.94, lng: 138.58 }
          }
        }
      ]
    }
  };

  const getStationRouteResponse = {
    data: {
      routes: [{ legs: [{ distance: { value: 5000 } }] }]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  });

  it('adds avoid: [tolls] to getRoute params when avoidTolls is true', async () => {
    directionsMock.mockResolvedValue(getRouteResponse);

    await RouteService.getRoute(ORIGIN, DESTINATION, true);

    expect(directionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ avoid: ['tolls'] })
      })
    );
  });

  it('omits avoid from getRoute params when avoidTolls is false', async () => {
    directionsMock.mockResolvedValue(getRouteResponse);

    await RouteService.getRoute(ORIGIN, DESTINATION, false);

    const params = directionsMock.mock.calls[0][0].params;
    expect(params).not.toHaveProperty('avoid');
  });

  it('adds avoid: [tolls] to getStationRoute params when avoidTolls is true', async () => {
    directionsMock.mockResolvedValue(getStationRouteResponse);

    await RouteService.getStationRoute(ORIGIN, DESTINATION, DESTINATION, 10, true);

    expect(directionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ avoid: ['tolls'] })
      })
    );
  });

  it('omits avoid from getStationRoute params when avoidTolls is false', async () => {
    directionsMock.mockResolvedValue(getStationRouteResponse);

    await RouteService.getStationRoute(ORIGIN, DESTINATION, DESTINATION, 10, false);

    const params = directionsMock.mock.calls[0][0].params;
    expect(params).not.toHaveProperty('avoid');
  });
});
