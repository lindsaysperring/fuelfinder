import { DistanceCache } from '@/lib/utils/distance-cache';
import type { Coordinates } from '@/lib/validations/distance-schema';

let distanceCache: DistanceCache | null = null;

function getDistanceCache(): DistanceCache {
  if (!distanceCache) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }
    distanceCache = new DistanceCache(apiKey);
  }
  return distanceCache;
}

export class DistanceService {
  static async calculateDistance(
    from: Coordinates,
    to: Coordinates
  ): Promise<number> {
    const cache = getDistanceCache();
    return cache.getDistance(from, to);
  }

  static async calculateDistances(
    from: Coordinates,
    toLocations: Coordinates[]
  ): Promise<number[]> {
    const cache = getDistanceCache();
    return cache.batchGetDistances(from, toLocations);
  }
}