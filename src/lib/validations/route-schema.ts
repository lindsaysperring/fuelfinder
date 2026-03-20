import { z } from 'zod';
import { coordinatesSchema } from './distance-schema';

export const routeEndpointSchema = z.object({
  type: z.enum(['current', 'home', 'address']),
  coordinates: coordinatesSchema.optional(),
  address: z.string().optional(),
  placeId: z.string().optional(),
});

export const findRouteStationsSchema = z.object({
  start: coordinatesSchema,
  end: coordinatesSchema,
  fuelType: z.string().min(1),
  fuelEconomy: z.number().positive(),
  fillAmount: z.number().positive(),
  detourToleranceKm: z.number().min(0).max(20),
  arriveFullEnabled: z.boolean(),
  tankSizeLitres: z.number().positive(),
  brandDiscounts: z
    .array(z.object({ brand: z.string(), discount: z.number() }))
    .default([]),
});

export const searchPlacesSchema = z.object({
  input: z.string().min(1).max(200),
  sessionToken: z.string().optional(),
});

export type FindRouteStationsInput = z.infer<typeof findRouteStationsSchema>;
export type SearchPlacesInput = z.infer<typeof searchPlacesSchema>;
