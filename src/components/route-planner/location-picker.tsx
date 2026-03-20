'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AddressAutocomplete } from './address-autocomplete';
import { getHomeCenterAction } from '@/actions/config-actions';
import { geocodePlaceAction } from '@/actions/route-actions';
import { notifications } from '@/components/notifications';
import type { Coordinates, LocationType, PlaceSuggestion, RouteEndpoint } from '@/types';

interface LocationPickerProps {
  label: string;
  value: RouteEndpoint;
  onChange: (endpoint: RouteEndpoint) => void;
}

export function LocationPicker({ label, value, onChange }: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [addressText, setAddressText] = useState(value.address ?? '');

  const selectType = (type: LocationType) => {
    onChange({ type, coordinates: value.coordinates, address: value.address });
    if (type === 'current') resolveCurrentLocation({ type });
    if (type === 'home') resolveHomeLocation({ type });
  };

  const resolveCurrentLocation = (base: Partial<RouteEndpoint>) => {
    if (!navigator.geolocation) {
      notifications.showError('Geolocation is not supported by your browser');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        onChange({ type: 'current', coordinates: coords, ...base });
        setLoading(false);
      },
      async () => {
        notifications.showError('Could not get your location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const resolveHomeLocation = async (base: Partial<RouteEndpoint>) => {
    setLoading(true);
    const result = await getHomeCenterAction();
    setLoading(false);
    if (result.success) {
      onChange({ type: 'home', coordinates: result.data, ...base });
    } else {
      notifications.showError('Failed to get home location');
    }
  };

  const handleAddressSelect = async (suggestion: PlaceSuggestion) => {
    setLoading(true);
    const result = await geocodePlaceAction(suggestion.placeId);
    setLoading(false);
    if (result.success) {
      onChange({
        type: 'address',
        coordinates: result.data.coordinates,
        address: suggestion.description,
        placeId: suggestion.placeId,
      });
    } else {
      notifications.showError('Could not resolve that address');
    }
  };

  const activeType = value.type;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        {(['current', 'home', 'address'] as LocationType[]).map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={activeType === t ? 'default' : 'outline'}
            onClick={() => selectType(t)}
            disabled={loading}
          >
            {t === 'current' && '📍 Current'}
            {t === 'home' && '🏠 Home'}
            {t === 'address' && '🔍 Address'}
          </Button>
        ))}
        {loading && <LoadingSpinner className="h-5 w-5 self-center" />}
      </div>
      {activeType === 'address' && (
        <AddressAutocomplete
          placeholder="Search for an address…"
          value={addressText}
          onChange={setAddressText}
          onSelect={handleAddressSelect}
        />
      )}
      {value.coordinates && (
        <p className="text-xs text-muted-foreground">
          {value.address ??
            `${value.coordinates.latitude.toFixed(4)}, ${value.coordinates.longitude.toFixed(4)}`}
        </p>
      )}
    </div>
  );
}
