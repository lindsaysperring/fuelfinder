'use server';

import {
  calculateDistanceSchema,
  calculateDistancesSchema,
  type Coordinates
} from '@/lib/validations/distance-schema';
import { DistanceService } from '@/lib/services/distance-service';
import { actionWrapper } from '@/lib/utils/action-wrapper';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/utils/rate-limit';

export async function calculateDistanceAction(
  from: Coordinates,
  to: Coordinates
) {
  return actionWrapper(async () => {
    // Rate limiting
    const identifier = await getRateLimitIdentifier();
    const allowed = await checkRateLimit(identifier, 100, 60000);
    if (!allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Validation
    const validated = calculateDistanceSchema.parse({ from, to });

    // Business logic
    const distance = await DistanceService.calculateDistance(
      validated.from,
      validated.to
    );

    return { distance };
  });
}

export async function calculateDistancesAction(
  from: Coordinates,
  toLocations: Coordinates[]
) {
  return actionWrapper(async () => {
    // Rate limiting
    const identifier = await getRateLimitIdentifier();
    const allowed = await checkRateLimit(identifier, 50, 60000);
    if (!allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Validation
    const validated = calculateDistancesSchema.parse({ from, toLocations });

    // Business logic
    const distances = await DistanceService.calculateDistances(
      validated.from,
      validated.toLocations
    );

    return { distances };
  });
}