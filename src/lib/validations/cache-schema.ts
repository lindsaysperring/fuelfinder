import { z } from 'zod';

export const maintenanceAuthSchema = z.object({
  maintenanceKey: z.string().min(1)
});

export type MaintenanceAuthInput = z.infer<typeof maintenanceAuthSchema>;