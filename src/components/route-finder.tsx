'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { RouteMap } from '@/components/route-map';
import { RouteResults } from '@/components/route-results';
import { DiscountManager } from '@/components/discount-manager';
import { notifications } from '@/components/notifications';
import { useGoogleMaps } from '@/hooks/use-google-maps';
import { searchAlongRouteAction } from '@/actions/route-actions';
import { MapPin, ArrowUpDown } from 'lucide-react';
import type { BrandDiscount, RouteStation } from '@/types';

interface AddressLocation {
  address: string;
  lat: number;
  lng: number;
}

type SortMode = 'value' | 'price' | 'detour';

interface RouteFinderProps {
  fuelEconomy: number;
  setFuelEconomy: (v: number) => void;
  selectedFuelType: string;
  setSelectedFuelType: (v: string) => void;
  fillAmount: number;
  setFillAmount: (v: number) => void;
  brandDiscounts: BrandDiscount[];
  setBrandDiscounts: (v: BrandDiscount[]) => void;
}

export function RouteFinder({
  fuelEconomy,
  setFuelEconomy,
  selectedFuelType,
  setSelectedFuelType,
  fillAmount,
  setFillAmount,
  brandDiscounts,
  setBrandDiscounts
}: RouteFinderProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [origin, setOrigin] = useState<AddressLocation | null>(null);
  const [destination, setDestination] = useState<AddressLocation | null>(null);
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState<'origin' | 'destination' | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [stations, setStations] = useState<RouteStation[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('value');
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  const handleSearch = useCallback(async () => {
    if (!origin || !destination) return;

    setLoading(true);
    setStations([]);
    setRoutePolyline(null);

    try {
      const result = await searchAlongRouteAction({
        origin: { latitude: origin.lat, longitude: origin.lng },
        destination: { latitude: destination.lat, longitude: destination.lng },
        fuelType: selectedFuelType,
        fuelEconomy,
        fillAmount,
        brandDiscounts
      });

      if (!result.success) {
        if (result.error.includes('ZERO_RESULTS') || result.error.includes('No route found')) {
          notifications.routeNotFound();
        } else {
          notifications.routeSearchError();
        }
        return;
      }

      setRoutePolyline(result.data.route.polyline);
      setRouteDistance(result.data.route.distance);
      setRouteDuration(result.data.route.duration);
      setStations(result.data.stations);
      notifications.routeSearchComplete(result.data.stations.length);

      const brands = new Set<string>();
      for (const s of result.data.stations) {
        if (s.brand) brands.add(s.brand);
      }
      setAvailableBrands(Array.from(brands).sort());
    } catch (error) {
      console.error('Route search error:', error);
      notifications.routeSearchError();
    } finally {
      setLoading(false);
    }
  }, [origin, destination, selectedFuelType, fuelEconomy, fillAmount, brandDiscounts]);

  const handleStationClick = useCallback((stationId: string) => {
    setActiveStationId(stationId);
  }, []);

  const handleOriginSelect = useCallback((result: AddressLocation) => {
    setOrigin(result);
    setOriginText(result.address);
  }, []);

  const handleDestinationSelect = useCallback((result: AddressLocation) => {
    setDestination(result);
    setDestinationText(result.address);
  }, []);

  const handleUseCurrentLocation = useCallback(
    (target: 'origin' | 'destination') => {
      if (!navigator.geolocation) {
        notifications.showError('Geolocation is not supported by your browser');
        return;
      }

      if (!window.google?.maps) {
        notifications.showError('Google Maps is still loading. Please try again.');
        return;
      }

      setLocationLoading(target);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({
              location: { lat, lng }
            });

            const address =
              response.results[0]?.formatted_address ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            const location: AddressLocation = { address, lat, lng };

            if (target === 'origin') {
              setOrigin(location);
              setOriginText(address);
            } else {
              setDestination(location);
              setDestinationText(address);
            }

            notifications.locationUpdated();
          } catch {
            const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            const location: AddressLocation = {
              address: fallback,
              lat,
              lng
            };

            if (target === 'origin') {
              setOrigin(location);
              setOriginText(fallback);
            } else {
              setDestination(location);
              setDestinationText(fallback);
            }

            notifications.locationUpdated();
          } finally {
            setLocationLoading(null);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          notifications.showError(
            'Failed to get your location. Please check your browser permissions.'
          );
          setLocationLoading(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    },
    []
  );

  const handleSwap = useCallback(() => {
    setOrigin(destination);
    setDestination(origin);
    setOriginText(destinationText);
    setDestinationText(originText);
  }, [origin, destination, originText, destinationText]);

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]'>
        <div>
          <label className='mb-2 block text-sm font-medium'>Origin</label>
          <div className='flex gap-2'>
            <div className='flex-1'>
              <AddressAutocomplete
                placeholder='Start address'
                onSelect={handleOriginSelect}
                isLoaded={isLoaded}
                defaultValue={originText}
              />
            </div>
            <Button
              variant='outline'
              size='icon'
              className='mt-0 shrink-0'
              onClick={() => handleUseCurrentLocation('origin')}
              disabled={locationLoading === 'origin'}
              title='Use current location'
            >
              {locationLoading === 'origin' ? (
                <LoadingSpinner />
              ) : (
                <MapPin className='h-4 w-4' />
              )}
            </Button>
          </div>
          {loadError && (
            <p className='text-destructive mt-1 text-xs'>{loadError}</p>
          )}
        </div>

        <div className='flex items-end justify-center'>
          <Button
            variant='ghost'
            size='icon'
            className='mb-0'
            onClick={handleSwap}
            disabled={!origin && !destination}
            title='Swap origin and destination'
          >
            <ArrowUpDown className='h-4 w-4' />
          </Button>
        </div>

        <div>
          <label className='mb-2 block text-sm font-medium'>Destination</label>
          <div className='flex gap-2'>
            <div className='flex-1'>
              <AddressAutocomplete
                placeholder='End address'
                onSelect={handleDestinationSelect}
                isLoaded={isLoaded}
                defaultValue={destinationText}
              />
            </div>
            <Button
              variant='outline'
              size='icon'
              className='mt-0 shrink-0'
              onClick={() => handleUseCurrentLocation('destination')}
              disabled={locationLoading === 'destination'}
              title='Use current location'
            >
              {locationLoading === 'destination' ? (
                <LoadingSpinner />
              ) : (
                <MapPin className='h-4 w-4' />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
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
          <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
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
        <div className='flex items-end'>
          <Button
            onClick={handleSearch}
            disabled={loading || !origin || !destination}
            className='w-full'
          >
            {loading ? <LoadingSpinner /> : 'Find Stations Along Route'}
          </Button>
        </div>
      </div>

      <DiscountManager
        discounts={brandDiscounts}
        onDiscountsChange={setBrandDiscounts}
        availableBrands={availableBrands}
      />

      {routeDistance !== null && routeDuration !== null && (
        <div className='text-muted-foreground flex gap-4 text-sm'>
          <span>Route: {routeDistance.toFixed(1)} km</span>
          <span>ETA: {Math.round(routeDuration / 60)} min</span>
        </div>
      )}

      {loading && !routePolyline && (
        <div className='flex min-h-[200px] items-center justify-center'>
          <LoadingSpinner />
        </div>
      )}

      {routePolyline && (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          <RouteMap
            routePolyline={routePolyline}
            stations={stations.map((s) => ({
              id: s.id,
              lat: s.location.lat,
              lng: s.location.lng,
              pricePerLiter: s.pricePerLiter
            }))}
            onStationClick={handleStationClick}
            activeStationId={activeStationId ?? undefined}
            isLoaded={isLoaded}
          />
          <RouteResults
            stations={stations}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            activeStationId={activeStationId}
          />
        </div>
      )}
    </div>
  );
}