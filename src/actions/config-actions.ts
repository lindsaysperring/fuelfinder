'use server';

import { actionWrapper } from '@/lib/utils/action-wrapper';
import type { ActionState } from '@/lib/utils/action-wrapper';
import { getHomeCenter } from '@/lib/utils/config';
import type { Coordinates } from '@/lib/utils/google-maps';

/**
 * Server action to get the home center coordinates at runtime
 * This reads environment variables on the server side where they are available at runtime
 */
export async function getHomeCenterAction(): Promise<ActionState<Coordinates>> {
  return actionWrapper(async () => {
    return getHomeCenter();
  });
}
