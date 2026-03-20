import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { RouteStation } from '@/types';

interface RouteStationCardProps {
  station: RouteStation;
  rank: number;
  fuelType: string;
}

export function RouteStationCard({ station, rank, fuelType }: RouteStationCardProps) {
  const isBest = rank === 1;

  return (
    <Card className={isBest ? 'border-green-500 ring-1 ring-green-500' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                isBest
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {rank}
            </span>
            <div>
              <p className="font-semibold leading-tight">{station.name}</p>
              <p className="text-xs text-muted-foreground">{station.address}</p>
              {station.detourKm > 0 && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  +{station.detourKm.toFixed(1)} km detour
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">
              ${station.totalCost.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">total cost</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2 text-center text-xs">
          <div>
            <p className="font-medium">
              {(station.pricePerLiter * 100).toFixed(1)}¢/L
            </p>
            <p className="text-muted-foreground">{fuelType} price</p>
          </div>
          <div>
            <p className="font-medium">
              {station.fillAmount.toFixed(0)} L
            </p>
            <p className="text-muted-foreground">fill amount</p>
          </div>
          <div>
            <p className="font-medium">
              ${station.fillCost.toFixed(2)}
            </p>
            <p className="text-muted-foreground">fuel cost</p>
          </div>
        </div>

        {station.detourCost > 0 && (
          <p className="mt-2 text-xs text-muted-foreground text-center">
            +${station.detourCost.toFixed(2)} detour cost
            · {station.distanceFromStart.toFixed(1)} km from start
          </p>
        )}
        {station.detourKm === 0 && (
          <p className="mt-2 text-xs text-muted-foreground text-center">
            {station.distanceFromStart.toFixed(1)} km from start
            · {station.distanceToEnd.toFixed(1)} km to destination
          </p>
        )}
      </CardContent>
    </Card>
  );
}
