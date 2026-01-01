'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getHomeCenterAction } from '@/actions/config-actions';
import { notifications } from '@/components/notifications';
import type { Coordinates } from '@/lib/utils/distance-cache';

interface LocationSelectorProps {
  onLocationChange: (location: Coordinates) => void;
}

export function LocationSelector({ onLocationChange }: LocationSelectorProps) {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = () => {
    setLoading(true);

    if (!navigator.geolocation) {
      notifications.showError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        onLocationChange(newLocation);
        notifications.locationUpdated();
        setLoading(false);
      },
      async (error) => {
        console.error('Error getting location:', error);
        notifications.showError(
          'Failed to get your location. Using home location as default.'
        );
        
        // Fetch home center from server
        const result = await getHomeCenterAction();
        if (result.success) {
          onLocationChange(result.data);
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const useDefaultLocation = async () => {
    setLoading(true);
    const result = await getHomeCenterAction();
    if (result.success) {
      onLocationChange(result.data);
      notifications.locationUpdated();
    } else {
      notifications.showError('Failed to get home location');
    }
    setLoading(false);
  };

  return (
    <div className='space-y-2'>
      <label className='mb-2 block text-sm font-medium'>Your Location</label>
      <div className='flex gap-2'>
        <Button
          onClick={getCurrentLocation}
          disabled={loading}
          variant='outline'
        >
          {loading ? <LoadingSpinner /> : 'Use My Location'}
        </Button>
        <Button
          onClick={useDefaultLocation}
          disabled={loading}
          variant='secondary'
        >
          Use Home
        </Button>
      </div>
    </div>
  );
}
