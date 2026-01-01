import { DistanceCache } from '@/lib/utils/distance-cache';
import { prisma } from '@/lib/db/client';

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

export class CacheService {
  static async cleanupExpired(): Promise<{ deletedCount: number }> {
    const cache = getDistanceCache();
    await cache.cleanupExpiredEntries();

    const deletedCount = await prisma.distance.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return { deletedCount: deletedCount.count };
  }

  static async getStatistics() {
    const now = new Date();

    const [stats, expiredCount] = await Promise.all([
      prisma.distance.aggregate({
        _count: { id: true },
        _min: { createdAt: true },
        _max: { createdAt: true, updatedAt: true }
      }),
      prisma.distance.count({
        where: {
          expiresAt: { lt: now }
        }
      })
    ]);

    return {
      totalEntries: stats._count.id,
      expiredEntries: expiredCount,
      oldestEntry: stats._min.createdAt,
      newestEntry: stats._max.createdAt,
      lastUpdated: stats._max.updatedAt,
      timestamp: now
    };
  }
}