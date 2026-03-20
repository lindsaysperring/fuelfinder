'use client';

import { useEffect, useMemo, useRef } from 'react';
import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { decodePolyline } from '@/lib/utils/google-directions';
import type { DirectionsResult, RouteStation } from '@/types';

interface RouteMapProps {
  directions: DirectionsResult;
  stations: RouteStation[];
  start: { latitude: number; longitude: number };
  end: { latitude: number; longitude: number };
}

function PolylineLayer({ encodedPolyline }: { encodedPolyline: string }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    const path = decodePolyline(encodedPolyline).map((c) => ({
      lat: c.latitude,
      lng: c.longitude,
    }));

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map,
    });

    return () => {
      polylineRef.current?.setMap(null);
    };
  }, [map, encodedPolyline]);

  return null;
}

export function RouteMap({ directions, stations, start, end }: RouteMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  const center = useMemo(() => {
    const waypoints = directions.waypointCoords;
    if (waypoints.length === 0) return { lat: start.latitude, lng: start.longitude };
    const midIdx = Math.floor(waypoints.length / 2);
    return { lat: waypoints[midIdx].latitude, lng: waypoints[midIdx].longitude };
  }, [directions.waypointCoords, start]);

  return (
    <APIProvider apiKey={apiKey}>
      <div className="h-72 w-full overflow-hidden rounded-xl border">
        <Map
          defaultCenter={center}
          defaultZoom={10}
          mapId="fuelfinder-route"
          disableDefaultUI
          gestureHandling="cooperative"
          className="h-full w-full"
        >
          <PolylineLayer encodedPolyline={directions.encodedPolyline} />

          {/* Start marker */}
          <AdvancedMarker position={{ lat: start.latitude, lng: start.longitude }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold shadow-md">
              A
            </div>
          </AdvancedMarker>

          {/* End marker */}
          <AdvancedMarker position={{ lat: end.latitude, lng: end.longitude }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold shadow-md">
              B
            </div>
          </AdvancedMarker>

          {/* Station markers */}
          {stations.map((s, i) => (
            <AdvancedMarker
              key={s.id}
              position={{ lat: s.location.y, lng: s.location.x }}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-md ring-2 ring-white">
                {i + 1}
              </div>
            </AdvancedMarker>
          ))}
        </Map>
      </div>
    </APIProvider>
  );
}
