'use server';

import { z } from 'zod';
import { actionWrapper } from '@/lib/utils/action-wrapper';

const boundingBoxSchema = z.object({
  neLat: z.number(),
  neLng: z.number(),
  swLat: z.number(),
  swLng: z.number()
});

export async function fetchPetrolStationsAction(bbox: {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
}) {
  return actionWrapper(async () => {
    const validated = boundingBoxSchema.parse(bbox);

    const ts = Date.now();
    const queryParams = new URLSearchParams({
      neLat: validated.neLat.toString(),
      neLng: validated.neLng.toString(),
      swLat: validated.swLat.toString(),
      swLng: validated.swLng.toString(),
      ts: ts.toString(),
      _: (ts - 5000).toString()
    });

    const url = `https://petrolspy.com.au/webservice-1/station/box?${queryParams}`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch petrol stations: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  });
}