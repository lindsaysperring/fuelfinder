'use client';

import { useEffect, useMemo, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { decodePolyline } from '@/lib/utils/google-directions';
import type { DirectionsResult, RouteStation } from '@/types';

interface RouteMapProps {
  directions: DirectionsResult;
  stations: RouteStation[];
  start: { latitude: number; longitude: number };
  end: { latitude: number; longitude: number };
}

interface MarkerDef {
  lat: number;
  lng: number;
  label: string;
  color: string;
}

function MapLayers({
  encodedPolyline,
  markers,
}: {
  encodedPolyline: string;
  markers: MarkerDef[];
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // Draw route polyline
    const path = decodePolyline(encodedPolyline).map((c) => ({
      lat: c.latitude,
      lng: c.longitude,
    }));

    polylineRef.current?.setMap(null);
    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map,
    });

    // Clear previous markers
    for (const m of markerRefs.current) m.setMap(null);
    markerRefs.current = [];

    // Draw markers imperatively (works without a GCP Map ID)
    for (const def of markers) {
      const marker = new google.maps.Marker({
        position: { lat: def.lat, lng: def.lng },
        map,
        label: {
          text: def.label,
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '12px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: def.color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 14,
        },
      });
      markerRefs.current.push(marker);
    }

    return () => {
      polylineRef.current?.setMap(null);
      for (const m of markerRefs.current) m.setMap(null);
    };
  }, [map, encodedPolyline, markers]);

  return null;
}

export function RouteMap({ directions, stations, start, end }: RouteMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  // Optional: set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID in .env for Advanced Markers / custom styling
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  const center = useMemo(() => {
    const waypoints = directions.waypointCoords;
    if (waypoints.length === 0) return { lat: start.latitude, lng: start.longitude };
    const midIdx = Math.floor(waypoints.length / 2);
    return { lat: waypoints[midIdx].latitude, lng: waypoints[midIdx].longitude };
  }, [directions.waypointCoords, start]);

  const markers: MarkerDef[] = useMemo(() => [
    { lat: start.latitude, lng: start.longitude, label: 'A', color: '#16a34a' },
    { lat: end.latitude, lng: end.longitude, label: 'B', color: '#dc2626' },
    ...stations.map((s, i) => ({
      lat: s.location.y,
      lng: s.location.x,
      label: String(i + 1),
      color: '#2563eb',
    })),
  ], [start, end, stations]);

  return (
    <APIProvider apiKey={apiKey}>
      <div className="h-72 w-full overflow-hidden rounded-xl border">
        <Map
          defaultCenter={center}
          defaultZoom={10}
          {...(mapId ? { mapId } : {})}
          disableDefaultUI
          gestureHandling="cooperative"
          className="h-full w-full"
        >
          <MapLayers encodedPolyline={directions.encodedPolyline} markers={markers} />
        </Map>
      </div>
    </APIProvider>
  );
}
