'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LocationPicker } from './location-picker';
import { RouteOptions } from './route-options';
import { RouteResults } from './route-results';
import { findRouteStationsAction } from '@/actions/route-actions';
import { loadRouteSettings, saveRouteSettings } from '@/lib/utils/local-storage';
import { notifications } from '@/components/notifications';
import type {
  BrandDiscount,
  DirectionsResult,
  RouteEndpoint,
  RouteSettings,
  RouteStation,
} from '@/types';

const DEFAULT_START: RouteEndpoint = { type: 'current' };
const DEFAULT_END: RouteEndpoint = { type: 'home' };

interface RouteTabProps {
  fuelEconomy: number;
  selectedFuelType: string;
  fillAmount: number;
  tankSizeLitres: number;
  onTankSizeChange: (litres: number) => void;
  brandDiscounts: BrandDiscount[];
}

export function RouteTab({
  fuelEconomy,
  selectedFuelType,
  fillAmount,
  tankSizeLitres,
  onTankSizeChange,
  brandDiscounts,
}: RouteTabProps) {
  const [settings, setSettings] = useState<RouteSettings>({
    start: DEFAULT_START,
    end: DEFAULT_END,
    detourToleranceKm: 5,
    arriveFullEnabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    directions: DirectionsResult;
    stations: RouteStation[];
  } | null>(null);

  // Load persisted route settings on mount
  useEffect(() => {
    const saved = loadRouteSettings();
    setSettings(saved);
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<RouteSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      saveRouteSettings(next);
    },
    [settings]
  );

  const canSearch =
    !!settings.start.coordinates && !!settings.end.coordinates && !loading;

  const handleSearch = async () => {
    if (!settings.start.coordinates || !settings.end.coordinates) {
      notifications.showError('Please select both a start and end location');
      return;
    }

    setLoading(true);
    setResults(null);

    const result = await findRouteStationsAction({
      start: settings.start.coordinates,
      end: settings.end.coordinates,
      fuelType: selectedFuelType,
      fuelEconomy,
      fillAmount,
      detourToleranceKm: settings.detourToleranceKm,
      arriveFullEnabled: settings.arriveFullEnabled,
      tankSizeLitres,
      brandDiscounts,
    });

    setLoading(false);

    if (result.success) {
      setResults(result.data);
    } else {
      notifications.showError(result.error ?? 'Could not find stations along this route');
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationPicker
          label="Start location"
          value={settings.start}
          onChange={(endpoint) => updateSettings({ start: endpoint })}
        />
        <LocationPicker
          label="End location"
          value={settings.end}
          onChange={(endpoint) => updateSettings({ end: endpoint })}
        />
      </div>

      <RouteOptions
        detourToleranceKm={settings.detourToleranceKm}
        onDetourChange={(km) => updateSettings({ detourToleranceKm: km })}
        arriveFullEnabled={settings.arriveFullEnabled}
        onArriveFullChange={(enabled) => updateSettings({ arriveFullEnabled: enabled })}
        tankSizeLitres={tankSizeLitres}
        onTankSizeChange={onTankSizeChange}
      />

      <Button
        className="w-full"
        onClick={handleSearch}
        disabled={!canSearch}
      >
        {loading ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Finding best stations…
          </>
        ) : (
          'Find stations along route'
        )}
      </Button>

      {results && (
        <RouteResults
          directions={results.directions}
          stations={results.stations}
          start={settings.start.coordinates!}
          end={settings.end.coordinates!}
          fuelType={selectedFuelType}
        />
      )}
    </div>
  );
}
