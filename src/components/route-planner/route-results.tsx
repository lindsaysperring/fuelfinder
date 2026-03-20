import { RouteMap } from './route-map';
import { RouteStationCard } from './route-station-card';
import type { Coordinates, DirectionsResult, RouteStation } from '@/types';

interface RouteResultsProps {
  directions: DirectionsResult;
  stations: RouteStation[];
  start: Coordinates;
  end: Coordinates;
  fuelType: string;
}

export function RouteResults({
  directions,
  stations,
  start,
  end,
  fuelType,
}: RouteResultsProps) {
  return (
    <div className="space-y-4">
      <RouteMap
        directions={directions}
        stations={stations}
        start={start}
        end={end}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Route: {directions.totalDistanceKm.toFixed(1)} km</span>
        <span>
          {Math.floor(directions.totalDurationSeconds / 3600) > 0 &&
            `${Math.floor(directions.totalDurationSeconds / 3600)}h `}
          {Math.round((directions.totalDurationSeconds % 3600) / 60)} min drive
        </span>
      </div>

      {stations.length === 0 ? (
        <p className="rounded-md bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          No petrol stations found along this route with the current settings.
          Try increasing the detour tolerance.
        </p>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Best stations along your route
          </h3>
          {stations.map((s, i) => (
            <RouteStationCard
              key={s.id}
              station={s}
              rank={i + 1}
              fuelType={fuelType}
            />
          ))}
        </div>
      )}
    </div>
  );
}
