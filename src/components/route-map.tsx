'use client';

import { useEffect, useRef } from 'react';
import { decodePolyline } from '@/lib/utils/polyline';

interface RouteMapProps {
  routePolyline: string;
  stations: Array<{
    id: string;
    lat: number;
    lng: number;
    pricePerLiter: number;
  }>;
  onStationClick: (stationId: string) => void;
  activeStationId?: string;
  isLoaded: boolean;
}

export function RouteMap({
  routePolyline,
  stations,
  onStationClick,
  activeStationId,
  isLoaded
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const startMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const endMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const activeStationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;

    const routePoints = decodePolyline(routePolyline);
    if (routePoints.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    for (const p of routePoints) {
      bounds.extend(new window.google.maps.LatLng(p.lat, p.lng));
    }

    const map = new window.google.maps.Map(mapRef.current, {
      mapId: 'route_map',
      zoom: 10,
      center: bounds.getCenter(),
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
    map.fitBounds(bounds, 50);
    mapInstanceRef.current = map;

    const decodedPath = routePoints.map(
      (p) => new window.google.maps.LatLng(p.lat, p.lng)
    );
    polylineRef.current = new window.google.maps.Polyline({
      path: decodedPath,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 1,
      strokeWeight: 4,
      map
    });

    if (routePoints.length > 0) {
      const hasPinElement = typeof (window.google.maps.marker as Record<string, unknown>).PinElement === 'function';
      if (hasPinElement) {
        const { PinElement } = window.google.maps.marker;
        const startPin = new PinElement({
          scale: 1.2,
          background: '#22c55e',
          borderColor: '#16a34a',
          glyphColor: '#ffffff'
        });
        startMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
          position: routePoints[0],
          map,
          content: startPin.element,
          title: 'Start'
        });

        const endPin = new PinElement({
          scale: 1.2,
          background: '#ef4444',
          borderColor: '#dc2626',
          glyphColor: '#ffffff'
        });
        endMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
          position: routePoints[routePoints.length - 1],
          map,
          content: endPin.element,
          title: 'Destination'
        });
      } else {
        startMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
          position: routePoints[0],
          map,
          title: 'Start'
        });
        endMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
          position: routePoints[routePoints.length - 1],
          map,
          title: 'Destination'
        });
      }
    }

    return () => {
      polylineRef.current?.setMap(null);
      startMarkerRef.current?.setMap(null);
      endMarkerRef.current?.setMap(null);
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [isLoaded, routePolyline]);

  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !window.google?.maps?.marker) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (stations.length === 0) return;

    const prices = stations.map((s) => s.pricePerLiter);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    for (const station of stations) {
      const ratio = (station.pricePerLiter - minPrice) / priceRange;
      const red = Math.round(255 * ratio);
      const green = Math.round(255 * (1 - ratio));
      const color = `rgb(${red}, ${green}, 50)`;

      const pinContent = document.createElement('div');
      pinContent.className = 'flex items-center justify-center rounded-full border-2 border-white shadow-md cursor-pointer';
      pinContent.style.backgroundColor = color;
      pinContent.style.color = '#ffffff';
      pinContent.style.fontSize = '11px';
      pinContent.style.fontWeight = 'bold';
      pinContent.style.padding = '4px 6px';
      pinContent.style.minWidth = '40px';
      pinContent.style.textAlign = 'center';
      pinContent.textContent = `$${station.pricePerLiter.toFixed(3)}`;

      pinContent.addEventListener('click', () => onStationClick(station.id));

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: station.lat, lng: station.lng },
        map: mapInstanceRef.current!,
        content: pinContent,
        title: `$${station.pricePerLiter.toFixed(3)}/L`
      });

      markersRef.current.push(marker);
    }
  }, [isLoaded, stations, onStationClick]);

  useEffect(() => {
    if (!activeStationId || !mapInstanceRef.current) return;
    if (activeStationId === activeStationIdRef.current) return;
    activeStationIdRef.current = activeStationId;

    const station = stations.find((s) => s.id === activeStationId);
    if (station) {
      mapInstanceRef.current.panTo({ lat: station.lat, lng: station.lng });
    }
  }, [activeStationId, stations]);

  return <div ref={mapRef} className='h-full min-h-[400px] w-full rounded-lg border' />;
}