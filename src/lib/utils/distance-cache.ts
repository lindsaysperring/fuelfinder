import { prisma } from '@/lib/db/client';
import { GoogleMapsService } from './google-maps';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class DistanceCache {
  private readonly googleMaps: GoogleMapsService;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Maps API key is required');
    }
    this.googleMaps = new GoogleMapsService(apiKey);
  }

  private roundCoordinate(coord: number): number {
    // Round to 5 decimal places (about 1.1 meters precision)
    return Math.round(coord * 100000) / 100000;
  }

  private getExpirationDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Cache for 30 days
    return date;
  }

  async getDistance(from: Coordinates, to: Coordinates): Promise<number> {
    // Round coordinates for better cache hits
    const fromLat = this.roundCoordinate(from.latitude);
    const fromLng = this.roundCoordinate(from.longitude);
    const toLat = this.roundCoordinate(to.latitude);
    const toLng = this.roundCoordinate(to.longitude);

    // Try to find in cache
    const cached = await prisma.distance.findUnique({
      where: {
        fromLat_fromLng_toLat_toLng: {
          fromLat,
          fromLng,
          toLat,
          toLng,
        },
      },
    });

    if (cached && cached.expiresAt > new Date()) {
      return cached.distance;
    }

    // If not in cache or expired, calculate using Google Maps
    const distance = await this.googleMaps.calculateDistance(from, to);

    // If we had a cached entry but it was expired, update it
    if (cached) {
      await prisma.distance.update({
        where: {
          id: cached.id
        },
        data: {
          distance,
          expiresAt: this.getExpirationDate(),
          updatedAt: new Date()
        }
      });
    } else {
      // Store new entry in cache with expiration
      await prisma.distance.create({
        data: {
          fromLat,
          fromLng,
          toLat,
          toLng,
          distance,
          expiresAt: this.getExpirationDate()
        }
      });
    }

    return distance;
  }

  async batchGetDistances(
    from: Coordinates,
    toLocations: Coordinates[]
  ): Promise<number[]> {
    const distances = await Promise.all(
      toLocations.map((to) => this.getDistance(from, to))
    );
    return distances;
  }

  async cleanupExpiredEntries(): Promise<void> {
    try {
      await prisma.distance.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired distance cache entries:', error);
      throw error;
    }
  }
}
