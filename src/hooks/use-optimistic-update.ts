import { useOptimistic } from 'react';

export function useOptimisticStations<T>(initialStations: T[]) {
  const [optimisticStations, addOptimisticStation] = useOptimistic(
    initialStations,
    (state, newStation: T) => [...state, newStation]
  );

  return { optimisticStations, addOptimisticStation };
}