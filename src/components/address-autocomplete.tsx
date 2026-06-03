'use client';

import { useRef, useEffect, useCallback } from 'react';

interface AddressResult {
  address: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  placeholder: string;
  onSelect: (result: AddressResult) => void;
  isLoaded: boolean;
  defaultValue?: string;
}

export function AddressAutocomplete({
  placeholder,
  onSelect,
  isLoaded,
  defaultValue
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const handlePlaceSelect = useCallback(
    async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      const placePrediction = selectEvent.placePrediction;
      if (!placePrediction) return;

      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location'] });

      if (place.formattedAddress && place.location) {
        const lat = place.location.lat();
        const lng = place.location.lng();
        onSelect({ address: place.formattedAddress, lat, lng });
      }
    },
    [onSelect]
  );

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.google?.maps?.places) return;

    const element = new google.maps.places.PlaceAutocompleteElement();
    element.setAttribute('placeholder', placeholder);
    if (defaultValue) {
      element.value = defaultValue;
    }

    element.addEventListener('gmp-select', handlePlaceSelect as EventListener);
    containerRef.current.appendChild(element);
    elementRef.current = element;

    return () => {
      element.removeEventListener('gmp-select', handlePlaceSelect as EventListener);
      element.remove();
      elementRef.current = null;
    };
  }, [isLoaded, placeholder, handlePlaceSelect]);

  useEffect(() => {
    if (elementRef.current && defaultValue !== undefined) {
      (elementRef.current as google.maps.places.PlaceAutocompleteElement).value = defaultValue;
    }
  }, [defaultValue]);

  return <div ref={containerRef} className='w-full' />;
}
