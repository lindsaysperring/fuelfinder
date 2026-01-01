'use server';

import { revalidatePath } from 'next/cache';
import { maintenanceAuthSchema } from '@/lib/validations/cache-schema';
import { CacheService } from '@/lib/services/cache-service';
import { actionWrapper } from '@/lib/utils/action-wrapper';

export async function cleanupCacheAction() {
  return actionWrapper(async () => {
    const result = await CacheService.cleanupExpired();
    revalidatePath('/admin/cache');
    return result;
  });
}

export async function getCacheStatisticsAction(maintenanceKey: string) {
  return actionWrapper(async () => {
    // Validate maintenance key
    const validated = maintenanceAuthSchema.parse({ maintenanceKey });

    const expectedKey = process.env.MAINTENANCE_KEY;
    if (!expectedKey || validated.maintenanceKey !== expectedKey) {
      throw new Error('Invalid maintenance key');
    }

    return await CacheService.getStatistics();
  });
}

export async function manualCleanupAction(maintenanceKey: string) {
  return actionWrapper(async () => {
    // Validate maintenance key
    const validated = maintenanceAuthSchema.parse({ maintenanceKey });

    const expectedKey = process.env.MAINTENANCE_KEY;
    if (!expectedKey || validated.maintenanceKey !== expectedKey) {
      throw new Error('Invalid maintenance key');
    }

    const result = await CacheService.cleanupExpired();
    revalidatePath('/admin/cache');
    return result;
  });
}