import { z } from 'zod';

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const calculateDistanceSchema = z.object({
  from: coordinatesSchema,
  to: coordinatesSchema
});

export const calculateDistancesSchema = z.object({
  from: coordinatesSchema,
  toLocations: z.array(coordinatesSchema).min(1)
});

export type Coordinates = z.infer<typeof coordinatesSchema>;
export type CalculateDistanceInput = z.infer<typeof calculateDistanceSchema>;
export type CalculateDistancesInput = z.infer<typeof calculateDistancesSchema>;