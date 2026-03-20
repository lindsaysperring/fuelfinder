'use server';

import { actionWrapper } from '@/lib/utils/action-wrapper';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/utils/rate-limit';
import { GoogleDirectionsService } from '@/lib/utils/google-directions';
import { GooglePlacesService } from '@/lib/utils/google-places';
import {
  preFilterStations,
  routeBoundingBox,
  scoreStation,
} from '@/lib/utils/route-utils';
import { DistanceService } from '@/lib/services/distance-service';
import { fetchPetrolStationsAction } from './petrolspy-actions';
import {
  findRouteStationsSchema,
  searchPlacesSchema,
} from '@/lib/validations/route-schema';
import type { Coordinates, RouteStation } from '@/types';

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  return key;
}

export async function findRouteStationsAction(input: unknown) {
  return actionWrapper(async () => {
    const identifier = await getRateLimitIdentifier();
    const allowed = await checkRateLimit(identifier, 10, 60000);
    if (!allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const validated = findRouteStationsSchema.parse(input);
    const {
      start,
      end,
      fuelType,
      fuelEconomy,
      fillAmount,
      detourToleranceKm,
      arriveFullEnabled,
      tankSizeLitres,
      brandDiscounts,
    } = validated;

    const directionsService = new GoogleDirectionsService(getApiKey());
    const directions = await directionsService.getDirections(start, end);

    // Build a bounding box around the route, expanded by the detour tolerance
    const bbox = routeBoundingBox(
      directions.waypointCoords,
      detourToleranceKm + 5 // extra margin for haversine vs driving distance
    );

    const stationsResult = await fetchPetrolStationsAction(bbox);
    if (!stationsResult.success) {
      throw new Error(stationsResult.error ?? 'Failed to fetch petrol stations');
    }

    const rawStations =
      (stationsResult.data as { message?: { list?: unknown[] } })?.message?.list ?? [];

    const candidates = preFilterStations(
      // biome-ignore lint/suspicious/noExplicitAny: external API shape
      rawStations as any[],
      directions.waypointCoords,
      fuelType,
      detourToleranceKm
    );

    if (candidates.length === 0) {
      return { directions, stations: [] as RouteStation[] };
    }

    // Batch driving distances: start→each station, then each station→end
    const stationCoords: Coordinates[] = candidates.map((s) => ({
      latitude: s.location.y,
      longitude: s.location.x,
    }));

    const [distancesFromStart, distancesToEnd] = await Promise.all([
      DistanceService.calculateDistances(start, stationCoords),
      DistanceService.calculateDistances(end, stationCoords),
    ]);

    const scored: RouteStation[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const result = scoreStation({
        station: candidates[i],
        fuelType,
        fuelEconomy,
        fillAmount,
        arriveFullEnabled,
        tankSizeLitres,
        brandDiscounts,
        distanceFromStart: distancesFromStart[i],
        distanceToEnd: distancesToEnd[i],
        totalRouteKm: directions.totalDistanceKm,
        detourToleranceKm,
      });
      if (result) scored.push(result);
    }

    scored.sort((a, b) => a.totalCost - b.totalCost);

    return {
      directions,
      stations: scored.slice(0, 5),
    };
  });
}

export async function searchPlacesAction(input: unknown) {
  return actionWrapper(async () => {
    const identifier = await getRateLimitIdentifier();
    const allowed = await checkRateLimit(identifier, 60, 60000);
    if (!allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const validated = searchPlacesSchema.parse(input);
    const service = new GooglePlacesService(getApiKey());
    const suggestions = await service.autocomplete(
      validated.input,
      validated.sessionToken
    );
    return { suggestions };
  });
}

export async function geocodePlaceAction(placeId: string) {
  return actionWrapper(async () => {
    const identifier = await getRateLimitIdentifier();
    const allowed = await checkRateLimit(identifier, 60, 60000);
    if (!allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (!placeId || typeof placeId !== 'string') {
      throw new Error('Invalid place ID');
    }

    const service = new GooglePlacesService(getApiKey());
    const coordinates = await service.geocodePlaceId(placeId);
    return { coordinates };
  });
}
