'use client';

import { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RouteStation } from '@/types';

type SortMode = 'value' | 'price' | 'detour';

interface RouteResultsProps {
  stations: RouteStation[];
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  activeStationId: string | null;
}

export function RouteResults({
  stations,
  sortMode,
  onSortModeChange,
  activeStationId
}: RouteResultsProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!activeStationId) return;
    const el = cardRefs.current.get(activeStationId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeStationId]);

  const sortedStations = [...stations].sort((a, b) => {
    switch (sortMode) {
      case 'value':
        return a.totalCost - b.totalCost;
      case 'price':
        return a.pricePerLiter - b.pricePerLiter;
      case 'detour':
        return (a.exactDetour ?? a.approxDetour) - (b.exactDetour ?? b.approxDetour);
      default:
        return 0;
    }
  });

  if (stations.length === 0) {
    return (
      <div className='text-muted-foreground py-8 text-center'>
        No stations found within 3 km of your route.
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <span className='text-sm font-medium'>Sort by:</span>
        <Button
          variant={sortMode === 'value' ? 'default' : 'outline'}
          size='sm'
          onClick={() => onSortModeChange('value')}
        >
          Best Value
        </Button>
        <Button
          variant={sortMode === 'price' ? 'default' : 'outline'}
          size='sm'
          onClick={() => onSortModeChange('price')}
        >
          Price
        </Button>
        <Button
          variant={sortMode === 'detour' ? 'default' : 'outline'}
          size='sm'
          onClick={() => onSortModeChange('detour')}
        >
          Detour
        </Button>
      </div>

      <div className='space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-1'>
        {sortedStations.map((station) => {
          const isActive = station.id === activeStationId;
          const detourValue = station.exactDetour ?? station.approxDetour;
          const isApprox = station.exactDetour === null;

          return (
            <Card
              key={station.id}
              ref={(el) => {
                if (el) cardRefs.current.set(station.id, el);
              }}
              className={`p-4 transition-all ${
                isActive
                  ? 'border-primary ring-primary/50 ring-2'
                  : ''
              }`}
            >
              <h3 className='text-lg font-bold'>{station.name}</h3>
              <p className='text-muted-foreground mb-2 text-sm'>
                {station.address}
              </p>
              <div className='space-y-1.5'>
                <p>
                  Fuel Price: ${station.pricePerLiter.toFixed(3)}/L{' '}
                  {station.discount > 0 && (
                    <span className='text-green-600'>
                      (-${(station.discount / 100).toFixed(2)} discount)
                    </span>
                  )}
                </p>
                <p>
                  Detour: {isApprox ? '~' : ''}{detourValue.toFixed(1)} km
                  {isApprox && (
                    <span className='text-muted-foreground text-xs ml-1'>(approximate)</span>
                  )}
                </p>
                <p>Travel Cost: ${station.travelCost.toFixed(2)}</p>
                <p className='font-bold'>
                  Total Cost: ${station.totalCost.toFixed(3)}/L
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}