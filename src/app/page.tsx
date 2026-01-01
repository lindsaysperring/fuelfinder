'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
import { loadSettings, saveSettings } from '@/lib/utils/local-storage';
import { ThemeToggle } from '@/components/theme-toggle';
import { DiscountManager } from '@/components/discount-manager';
import type { BrandDiscount } from '@/types';

interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  location: {
    x: number; // longitude
    y: number; // latitude
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

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SETTINGS_SAVE_DELAY = 1000; // Delay saving settings by 1 second

// Default fallback coordinates (Adelaide, Australia)
const FALLBACK_LOCATION: Coordinates = {
  latitude: -34.9285,
  longitude: 138.6007
};

const DEFAULT_SETTINGS = {
  fuelEconomy: 10,
  selectedFuelType: 'U91',
  fillAmount: 40,
  brandDiscounts: [
    { brand: 'AMPOL', discount: 8 },
    { brand: 'CALTEX', discount: 10 }
  ]
};

export default function Home() {
  const [stations, setStations] = useState<StationWithDistance[]>([]);
  const [fuelEconomy, setFuelEconomy] = useState<number>(
    DEFAULT_SETTINGS.fuelEconomy
  );
  const [selectedFuelType, setSelectedFuelType] = useState<string>(
    DEFAULT_SETTINGS.selectedFuelType
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [location, setLocation] = useState<Coordinates>(FALLBACK_LOCATION);
  const [fillAmount, setFillAmount] = useState<number>(
    DEFAULT_SETTINGS.fillAmount
  );
  const [brandDiscounts, setBrandDiscounts] = useState<BrandDiscount[]>(
    DEFAULT_SETTINGS.brandDiscounts
  );
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use the distance calculation hook
  const { calculateDistances } = useDistance();

  // Initialize home center from server on mount
  useEffect(() => {
    const initializeHomeCenter = async () => {
      const result = await getHomeCenterAction();
      if (result.success) {
        // Only set location if there's no saved location in localStorage
        const savedSettings = loadSettings();
        if (!savedSettings?.lastLocation || savedSettings.lastLocation === FALLBACK_LOCATION) {
          setLocation(result.data);
        }
      }
    };
    initializeHomeCenter();
  }, []);

  // Load saved settings on mount
  useEffect(() => {
    try {
      const savedSettings = loadSettings();
      if (savedSettings) {
        setFuelEconomy(
          savedSettings.fuelEconomy || DEFAULT_SETTINGS.fuelEconomy
        );
        setSelectedFuelType(
          savedSettings.selectedFuelType || DEFAULT_SETTINGS.selectedFuelType
        );
        if (savedSettings.lastLocation) {
          setLocation(savedSettings.lastLocation);
        }
        setFillAmount(savedSettings.fillAmount || DEFAULT_SETTINGS.fillAmount);
        setBrandDiscounts(
          savedSettings.brandDiscounts || DEFAULT_SETTINGS.brandDiscounts
        );
        notifications.showInfo('Loaded your saved preferences');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      notifications.showError('Failed to load saved preferences');
    }
  }, []);

  // Save settings when they change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        saveSettings({
          fuelEconomy,
          selectedFuelType,
          lastLocation: location,
          fillAmount,
          brandDiscounts
        });
        notifications.settingsSaved();
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }, SETTINGS_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [fuelEconomy, selectedFuelType, location, fillAmount, brandDiscounts]);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate bounding box with 20km radius around current location
      const boundingBox = calculateBoundingBox(location, 20);
      
      const result = await fetchPetrolStationsAction(boundingBox);
      if (!result.success) {
        throw new Error(result.error);
      }

      const data = result.data;
      if (!data?.message?.list?.length) {
        throw new Error('No station data received');
      }

      const destinations = data.message.list.map((station: Station) => ({
        latitude: station.location.y,
        longitude: station.location.x
      }));

      const distances = await calculateDistances(location, destinations);

      const stationsWithDistances = data.message.list
        .filter((station: Station) => {
          // Only include stations that have the selected fuel type
          return station.prices[selectedFuelType]?.amount !== undefined;
        })
        .map((station: Station, index: number) => {
          const distance = distances[index];

          const fuelPrice = station.prices[selectedFuelType]?.amount || 0;

          // Apply brand discounts (in cents per litre)
          const brandDiscount = brandDiscounts.find(
            (d) => d.brand === station.brand
          );
          const discount = brandDiscount?.discount || 0;

          const discountedFuelPrice = fuelPrice - discount;

          // Convert fuel price from cents to dollars
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

      // Sort by total effective cost
      const sortedStations = stationsWithDistances.sort(
        (a: StationWithDistance, b: StationWithDistance) =>
          a.totalCost - b.totalCost
      );
      setStations(sortedStations);
      
      // Extract unique brands from the stations
      const uniqueBrands = new Set<string>();
      for (const station of data.message.list) {
        if (station.brand) {
          uniqueBrands.add(station.brand);
        }
      }
      const brands = Array.from(uniqueBrands).sort((a, b) => a.localeCompare(b));
      setAvailableBrands(brands);
      
      setLastUpdated(new Date());
      notifications.pricesUpdated();
    } catch (error) {
      console.error('Error fetching stations:', error);
      notifications.loadError();
    } finally {
      setLoading(false);
    }
  }, [
    location,
    fuelEconomy,
    selectedFuelType,
    fillAmount,
    brandDiscounts,
    calculateDistances
  ]);

  useEffect(() => {
    fetchStations();
    const interval = setInterval(fetchStations, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStations]);

  // Find closest station for comparison
  const closestStation =
    stations.length > 0
      ? stations.reduce(
          (prev, curr) => (prev.distance < curr.distance ? prev : curr),
          stations[0]
        )
      : null;

  return (
    <main className='container mx-auto p-4'>
      <div className='mb-6 space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>Fuel Finder</h1>
            <p className='text-muted-foreground'>
              Find the cheapest petrol considering both price and travel cost.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <ThemeToggle />
            <RefreshButton
              onRefresh={fetchStations}
              lastUpdated={lastUpdated}
              isLoading={loading}
            />
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <LocationSelector onLocationChange={setLocation} />

          <div>
            <label className='mb-2 block text-sm font-medium'>
              Fuel Economy (L/100km)
            </label>
            <Input
              type='number'
              value={fuelEconomy}
              onChange={(e) => setFuelEconomy(Number(e.target.value))}
              min='0'
              step='0.1'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium'>Fuel Type</label>
            <Select
              value={selectedFuelType}
              onValueChange={setSelectedFuelType}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select fuel type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='U91'>Unleaded 91</SelectItem>
                <SelectItem value='U95'>Unleaded 95</SelectItem>
                <SelectItem value='U98'>Unleaded 98</SelectItem>
                <SelectItem value='DIESEL'>Diesel</SelectItem>
                <SelectItem value='LPG'>LPG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium'>
              Fill Amount (Liters)
            </label>
            <Input
              type='number'
              value={fillAmount}
              onChange={(e) => setFillAmount(Number(e.target.value))}
              min='0'
              step='1'
            />
          </div>
        </div>

        <div className='mt-4'>
          <DiscountManager
            discounts={brandDiscounts}
            onDiscountsChange={setBrandDiscounts}
            availableBrands={availableBrands}
          />
        </div>
      </div>

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
    </main>
  );
}
