'use server';

import { z } from 'zod';
import { actionWrapper } from '@/lib/utils/action-wrapper';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/utils/rate-limit';
import { RouteService } from '@/lib/services/route-service';
import { fetchPetrolStationsAction } from '@/actions/petrolspy-actions';
import { decodePolyline, haversineDistance, minDistanceToRoute } from '@/lib/utils/polyline';
import { calculateBoundingBox } from '@/lib/utils/config';
import type { BrandDiscount } from '@/types';

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

const brandDiscountSchema = z.object({
  brand: z.string(),
  discount: z.number().min(0)
});

const routeSearchSchema = z.object({
  origin: coordinatesSchema,
  destination: coordinatesSchema,
  fuelType: z.string().min(1),
  fuelEconomy: z.number().min(0),
  fillAmount: z.number().min(0),
  brandDiscounts: z.array(brandDiscountSchema).default([]),
  maxDestDistanceKm: z.number().min(0).optional(),
  avoidTolls: z.boolean().default(true)
});

interface RouteStationResult {
  id: string;
  name: string;
  brand: string;
  address: string;
  location: { lat: number; lng: number };
  pricePerLiter: number;
  discount: number;
  approxDetour: number;
  exactDetour: number | null;
  travelCost: number;
  totalCost: number;
}

interface RouteSearchResult {
  route: {
    polyline: string;
    distance: number;
    duration: number;
    bounds: { neLat: number; neLng: number; swLat: number; swLng: number };
  };
  stations: RouteStationResult[];
}

async function mapInChunks<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const chunkResults = await Promise.all(chunk.map(fn));
    chunkResults.forEach((r, j) => { results[i + j] = r; });
  }
  return results;
}

export async function searchAlongRouteAction(input: z.input<typeof routeSearchSchema>) {
  return actionWrapper<RouteSearchResult>(async () => {
    const identifier = await getRateLimitIdentifier();
    const allowed = await checkRateLimit(identifier, 20, 60000);
    if (!allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const validated = routeSearchSchema.parse(input);
    const { origin, destination, fuelType, fuelEconomy, fillAmount, brandDiscounts, maxDestDistanceKm, avoidTolls } = validated;

    const route = await RouteService.getRoute(origin, destination, avoidTolls);
    if (!route) {
      throw new Error('No route found between the specified locations');
    }

    const maxDestFilter = maxDestDistanceKm ?? 0;
    const filterEnabled = maxDestFilter > 0;
    const originalDistanceKm = route.distance;
    const destinationPoint = { lat: destination.latitude, lng: destination.longitude };

    const routeBounds = route.bounds;
    const centerLat = (routeBounds.neLat + routeBounds.swLat) / 2;
    const centerLng = (routeBounds.neLng + routeBounds.swLng) / 2;
    const latRadius = (routeBounds.neLat - routeBounds.swLat) / 2 * 111.32;
    const lngRadius = (routeBounds.neLng - routeBounds.swLng) / 2 * 111.32 * Math.cos((centerLat * Math.PI) / 180);
    const neededRadius = Math.max(latRadius, lngRadius) + 5;

    const bbox = calculateBoundingBox(
      { latitude: centerLat, longitude: centerLng },
      Math.max(neededRadius, 10)
    );

    const stationsResult = await fetchPetrolStationsAction(bbox);
    if (!stationsResult.success) {
      throw new Error(stationsResult.error);
    }

    const stationList = stationsResult.data?.message?.list ?? [];
    const routePoints = decodePolyline(route.polyline);

    const stationsWithDetour: RouteStationResult[] = [];

    for (const station of stationList) {
      const fuelPrice = station.prices?.[fuelType]?.amount;
      if (fuelPrice === undefined) continue;

      const brandDiscount = brandDiscounts.find((d: BrandDiscount) => d.brand === station.brand);
      const discount = brandDiscount?.discount || 0;
      const discountedFuelPrice = fuelPrice - discount;
      const pricePerLiter = discountedFuelPrice / 100;

      const stationPoint = { lat: station.location.y, lng: station.location.x };
      const distToRoute = minDistanceToRoute(stationPoint, routePoints);

      if (distToRoute > 3) continue;

      if (filterEnabled && haversineDistance(stationPoint, destinationPoint) > maxDestFilter) continue;

      const approxDetour = 2 * distToRoute;
      const travelCost = (approxDetour * fuelEconomy * pricePerLiter) / 100;
      const totalCost = (pricePerLiter * fillAmount + travelCost) / fillAmount;

      stationsWithDetour.push({
        id: station.id,
        name: station.name,
        brand: station.brand,
        address: station.address,
        location: { lat: stationPoint.lat, lng: stationPoint.lng },
        pricePerLiter,
        discount,
        approxDetour,
        exactDetour: null,
        travelCost,
        totalCost
      });
    }

    stationsWithDetour.sort((a, b) => a.totalCost - b.totalCost);

    const candidatePool = filterEnabled
      ? stationsWithDetour
      : stationsWithDetour.slice(0, 10);

    const exactResults = await mapInChunks(candidatePool, 5, async (s) => {
      try {
        const info = await RouteService.getStationRoute(
          origin,
          { latitude: s.location.lat, longitude: s.location.lng },
          destination,
          originalDistanceKm,
          avoidTolls
        );
        return { id: s.id, info };
      } catch {
        return { id: s.id, info: null };
      }
    });

    const infoMap = new Map(exactResults.map(r => [r.id, r.info]));

    const finalCandidates: RouteStationResult[] = [];
    for (const s of candidatePool) {
      const info = infoMap.get(s.id);
      if (!info) {
        if (!filterEnabled) finalCandidates.push(s);
        continue;
      }
      if (filterEnabled && info.distanceToDestinationKm > maxDestFilter) continue;
      s.exactDetour = info.detourKm;
      s.travelCost = (info.detourKm * fuelEconomy * s.pricePerLiter) / 100;
      s.totalCost = (s.pricePerLiter * fillAmount + s.travelCost) / fillAmount;
      finalCandidates.push(s);
    }

    finalCandidates.sort((a, b) => a.totalCost - b.totalCost);
    const top10 = finalCandidates.slice(0, 10);

    return {
      route: {
        polyline: route.polyline,
        distance: route.distance,
        duration: route.duration,
        bounds: routeBounds
      },
      stations: top10
    };
  });
}