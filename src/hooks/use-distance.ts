import { useState, useCallback } from 'react';
import { calculateDistanceAction, calculateDistancesAction } from '@/actions/distance-actions';
import { notifications } from '@/components/notifications';
import type { Coordinates } from '@/lib/validations/distance-schema';

export function useDistance() {
  const [loading, setLoading] = useState(false);

  const calculateDistance = useCallback(async (from: Coordinates, to: Coordinates) => {
    setLoading(true);
    try {
      const result = await calculateDistanceAction(from, to);
      if (!result.success) {
        notifications.showError(result.error);
        return 0;
      }
      return result.data.distance;
    } catch (error) {
      console.error('Error calculating distance:', error);
      notifications.showError('Failed to calculate distance');
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateDistances = useCallback(
    async (from: Coordinates, toLocations: Coordinates[]) => {
      setLoading(true);
      try {
        const result = await calculateDistancesAction(from, toLocations);
        if (!result.success) {
          notifications.showError(result.error);
          return toLocations.map(() => 0);
        }
        return result.data.distances;
      } catch (error) {
        console.error('Error calculating distances:', error);
        notifications.showError('Failed to calculate distances');
        return toLocations.map(() => 0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { calculateDistance, calculateDistances, loading };
}