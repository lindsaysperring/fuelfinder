'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LocationSelector } from '@/components/location-selector';
import { SavingsCalculator } from '@/components/savings-calculator';
import { RefreshButton } from '@/components/refresh-button';
import { notifications } from '@/components/notifications';
import { fetchPetrolStationsAction } from '@/actions/petrolspy-actions';
import { getHomeCenterAction } from '@/actions/config-actions';
import { useDistance } from '@/hooks/use-distance';
import { calculateBoundingBox } from '@/lib/utils/config';
import type { Coordinates } from '@/lib/utils/distance-cache';
import { loadSettings } from '@/lib/utils/local-storage';
import type { BrandDiscount } from '@/types';

interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  location: {
    x: number;
    y: number;
  };
  prices: {
    [key: string]: {
      amount: number;
      type: string;
    };
  };
}

interface StationWithDistance extends Station {
  distance: number;
  travelCost: number;
  totalCost: number;
  pricePerLiter: number;
  discount: number;
}

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

const FALLBACK_LOCATION: Coordinates = {
  latitude: -34.9285,
  longitude: 138.6007
};

interface StationSearchProps {
  fuelEconomy: number;
  selectedFuelType: string;
  fillAmount: number;
  brandDiscounts: BrandDiscount[];
}

export function StationSearch({
  fuelEconomy,
  selectedFuelType,
  fillAmount,
  brandDiscounts
}: StationSearchProps) {
  const [stations, setStations] = useState<StationWithDistance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [location, setLocation] = useState<Coordinates>(FALLBACK_LOCATION);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { calculateDistances } = useDistance();

  useEffect(() => {
    const initializeHomeCenter = async () => {
      const result = await getHomeCenterAction();
      if (result.success) {
        const savedSettings = loadSettings();
        if (!savedSettings?.lastLocation || savedSettings.lastLocation === FALLBACK_LOCATION) {
          setLocation(result.data);
        }
      }
    };
    initializeHomeCenter();
  }, []);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const boundingBox = calculateBoundingBox(location, 20);

      const result = await fetchPetrolStationsAction(boundingBox);
      if (!result.success) {
        throw new Error(result.error);
      }

      const data = result.data;
      if (!data?.message?.list?.length) {
        throw new Error('No station data received');
      }

      const filteredStations = data.message.list.filter(
        (station: Station) =>
          station.prices[selectedFuelType]?.amount !== undefined
      );

      if (filteredStations.length === 0) {
        setStations([]);
        setLastUpdated(new Date());
        return;
      }

      const destinations = filteredStations.map((station: Station) => ({
        latitude: station.location.y,
        longitude: station.location.x
      }));

      const distances = await calculateDistances(location, destinations);

      const stationsWithDistances = filteredStations.map(
        (station: Station, index: number) => {
          const distance = distances[index];
          const fuelPrice = station.prices[selectedFuelType]?.amount || 0;
          const brandDiscount = brandDiscounts.find(
            (d) => d.brand === station.brand
          );
          const discount = brandDiscount?.discount || 0;
          const discountedFuelPrice = fuelPrice - discount;
          const pricePerLiter = discountedFuelPrice / 100;
          const travelCost = (distance * 2 * fuelEconomy * pricePerLiter) / 100;
          const totalCost =
            (pricePerLiter * fillAmount + travelCost) / fillAmount;

          return {
            ...station,
            distance,
            travelCost,
            totalCost,
            pricePerLiter,
            discount
          };
        });

      const sortedStations = stationsWithDistances.sort(
        (a: StationWithDistance, b: StationWithDistance) =>
          a.totalCost - b.totalCost
      );
      setStations(sortedStations);

      setLastUpdated(new Date());
      notifications.pricesUpdated();
    } catch (error) {
      console.error('Error fetching stations:', error);
      notifications.loadError();
    } finally {
      setLoading(false);
    }
  }, [location, fuelEconomy, selectedFuelType, fillAmount, brandDiscounts, calculateDistances]);

  useEffect(() => {
    fetchStations();
    const interval = setInterval(fetchStations, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStations]);

  const closestStation =
    stations.length > 0
      ? stations.reduce(
          (prev, curr) => (prev.distance < curr.distance ? prev : curr),
          stations[0]
        )
      : null;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-end gap-2'>
        <RefreshButton
          onRefresh={fetchStations}
          lastUpdated={lastUpdated}
          isLoading={loading}
        />
      </div>

      <LocationSelector onLocationChange={setLocation} />

      {loading && stations.length === 0 ? (
        <div className='flex min-h-[200px] items-center justify-center'>
          <LoadingSpinner />
        </div>
      ) : (
        <div className='grid max-h-[calc(100vh-300px)] grid-cols-1 gap-4 overflow-y-auto p-1 md:grid-cols-2 lg:grid-cols-3'>
          {stations.length > 0 ? (
            stations.map((station) => (
              <Card key={station.id} className='p-4'>
                <h2 className='mb-2 text-xl font-bold'>{station.name}</h2>
                <p className='text-muted-foreground mb-2 text-sm'>
                  {station.address}
                </p>
                <div className='space-y-2'>
                  <p>
                    Fuel Price: ${station.pricePerLiter.toFixed(3)}/L{' '}
                    {station.discount > 0 && (
                      <span className='text-green-600'>
                        (-${(station.discount / 100).toFixed(2)} discount)
                      </span>
                    )}
                  </p>
                  <p>Distance: {station.distance.toFixed(1)} km</p>
                  <p>Travel Cost: ${station.travelCost.toFixed(2)}</p>
                  <p className='font-bold'>
                    Total Cost: ${station.totalCost.toFixed(3)}/L
                  </p>

                  {closestStation && station.id !== closestStation.id && (
                    <SavingsCalculator
                      basePrice={closestStation.totalCost}
                      bestPrice={station.pricePerLiter}
                      distance={station.distance}
                      travelCost={station.travelCost}
                      averageRefillLiters={fillAmount}
                    />
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className='text-muted-foreground col-span-full text-center'>
              No stations found with the selected fuel type.
            </div>
          )}
        </div>
      )}
    </div>
  );
}